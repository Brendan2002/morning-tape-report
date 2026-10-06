import { createServerFn } from "@tanstack/react-start";

// NY Fed Markets API (no key). Successful responses are cached briefly in memory;
// after expiry a failed call returns "unavailable" — never a carried-forward value.
const BASE = "https://markets.newyorkfed.org";
const cache = new Map<string, { at: number; v: unknown }>();
async function getJson(path: string, ttlMs: number): Promise<any | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < ttlMs) return hit.v;
  try {
    const res = await fetch(BASE + path, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const v = await res.json();
    cache.set(path, { at: Date.now(), v });
    return v;
  } catch {
    return null;
  }
}
const num = (x: unknown) => (x === "" || x == null ? null : Number.isFinite(Number(x)) ? Number(x) : null);
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const HOUR = 3600_000;

/* ---------------- Reference rates ---------------- */

export type RefRateId = "SOFR" | "EFFR" | "OBFR" | "TGCR" | "BGCR" | "SOFR30" | "SOFR90" | "SOFR180" | "SOFRINDEX";
export type RefRate = {
  id: RefRateId;
  available: boolean;
  value: number | null;
  effectiveDate: string | null;
  priorValue: number | null;
  priorDate: string | null;
  change: number | null; // our calculation, percentage points
  targetFrom: number | null;
  targetTo: number | null;
  isIndex: boolean;
};
const ORDER: RefRateId[] = ["SOFR", "EFFR", "OBFR", "TGCR", "BGCR", "SOFR30", "SOFR90", "SOFR180", "SOFRINDEX"];
const blank = (id: RefRateId): RefRate => ({
  id, available: false, value: null, effectiveDate: null, priorValue: null, priorDate: null, change: null, targetFrom: null, targetTo: null, isIndex: id === "SOFRINDEX",
});

async function lastTwo(path: string) {
  const j = await getJson(path, HOUR);
  const rows = (Array.isArray(j?.refRates) ? j.refRates : [])
    .filter((x: any) => num(x?.percentRate) != null && isDate(x?.effectiveDate))
    .sort((a: any, b: any) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
  return rows as { effectiveDate: string; percentRate: number }[];
}

export async function fetchRefRates(): Promise<RefRate[]> {
  const [all, sofr2, effr2] = await Promise.all([
    getJson("/api/rates/all/latest.json", HOUR),
    lastTwo("/api/rates/secured/sofr/last/2.json"),
    lastTwo("/api/rates/unsecured/effr/last/2.json"),
  ]);
  const out = new Map<RefRateId, RefRate>(ORDER.map((id) => [id, blank(id)]));
  for (const r of Array.isArray(all?.refRates) ? all.refRates : []) {
    if (!isDate(r?.effectiveDate)) continue;
    const t = String(r.type);
    if (t === "SOFRAI") {
      const set = (id: RefRateId, v: unknown) => {
        const n = num(v);
        if (n != null) out.set(id, { ...blank(id), available: true, value: n, effectiveDate: r.effectiveDate });
      };
      set("SOFR30", r.average30day); set("SOFR90", r.average90day); set("SOFR180", r.average180day); set("SOFRINDEX", r.index);
    } else if (["SOFR", "EFFR", "OBFR", "TGCR", "BGCR"].includes(t)) {
      const n = num(r.percentRate);
      if (n != null) out.set(t as RefRateId, { ...blank(t as RefRateId), available: true, value: n, effectiveDate: r.effectiveDate, targetFrom: num(r.targetRateFrom), targetTo: num(r.targetRateTo) });
    }
  }
  // Day-over-day for SOFR and EFFR (our calculation) from the last-2 endpoints.
  for (const [id, rows] of [["SOFR", sofr2], ["EFFR", effr2]] as const) {
    const cur = out.get(id)!;
    const [a, b] = rows;
    if (a && b) {
      const base = cur.available && cur.effectiveDate === a.effectiveDate ? cur : { ...cur, available: true, value: a.percentRate, effectiveDate: a.effectiveDate };
      out.set(id, { ...base, priorValue: b.percentRate, priorDate: b.effectiveDate, change: Math.round((a.percentRate - b.percentRate) * 1000) / 1000 });
    }
  }
  return ORDER.map((id) => out.get(id)!);
}

export const getRefRates = createServerFn({ method: "GET" }).handler(() => fetchRefRates());

/** Back-compat for MCP / other callers. */
export async function fetchNyFedRate(id: "SOFR" | "EFFR") {
  const r = (await fetchRefRates()).find((x) => x.id === id)!;
  return { id, available: r.available, rate: r.value, effectiveDate: r.effectiveDate, priorRate: r.priorValue, priorDate: r.priorDate, change: r.change, source: "NY Fed" as const };
}

/* ---------------- Operations & balance sheet ---------------- */

export type SeriesPt = { date: string; v: number };
export type FedOps = {
  rrp: { available: boolean; date: string | null; totalBn: number | null; counterparties: number | null; priorDate: string | null; priorBn: number | null; history: SeriesPt[] };
  soma: { available: boolean; date: string | null; totalTn: number | null; priorWeekTn: number | null; priorWeekDate: string | null; yearAgoTn: number | null; yearAgoDate: string | null; history: SeriesPt[]; treasuriesTn: SeriesPt[]; mbsTn: SeriesPt[] };
  mbsOps: { date: string; type: string; acceptedBn: number | null }[];
};

export const getFedOps = createServerFn({ method: "GET" }).handler(async (): Promise<FedOps> => {
  const [rrpJ, somaJ, ambsJ] = await Promise.all([
    getJson("/api/rp/reverserepo/all/results/last/30.json", 15 * 60_000),
    getJson("/api/soma/summary.json", 6 * HOUR),
    getJson("/api/ambs/all/results/summary/last/5.json", HOUR),
  ]);

  // ON RRP: overnight reverse repo operations, one per date (sum if several).
  const byDate = new Map<string, { amt: number; cpty: number }>();
  for (const o of Array.isArray(rrpJ?.repo?.operations) ? rrpJ.repo.operations : []) {
    if (o?.operationType !== "Reverse Repo" || o?.term !== "Overnight" || !isDate(o?.operationDate)) continue;
    const amt = num(o.totalAmtAccepted);
    if (amt == null) continue;
    const prev = byDate.get(o.operationDate) ?? { amt: 0, cpty: 0 };
    byDate.set(o.operationDate, { amt: prev.amt + amt, cpty: prev.cpty + (num(o.acceptedCpty) ?? 0) });
  }
  const rrpHist = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, x]) => ({ date, v: x.amt / 1e9, cpty: x.cpty }));
  const rLast = rrpHist.at(-1), rPrev = rrpHist.at(-2);

  // SOMA weekly holdings.
  const rows = (Array.isArray(somaJ?.soma?.summary) ? somaJ.soma.summary : [])
    .filter((r: any) => isDate(r?.asOfDate) && num(r?.total) != null)
    .sort((a: any, b: any) => (a.asOfDate < b.asOfDate ? -1 : 1));
  const tn = (x: unknown) => (num(x) ?? 0) / 1e12;
  const last = rows.at(-1), prevW = rows.at(-2);
  let yearAgo: any = null;
  if (last) {
    const d = new Date(last.asOfDate + "T12:00:00Z"); d.setUTCFullYear(d.getUTCFullYear() - 1);
    const target = d.toISOString().slice(0, 10);
    yearAgo = [...rows].reverse().find((r: any) => r.asOfDate <= target) ?? null;
  }
  const yr = last ? rows.filter((r: any) => r.asOfDate >= (yearAgo?.asOfDate ?? "")) : [];
  const treas = (r: any) => tn(r.notesbonds) + tn(r.bills) + tn(r.frn) + tn(r.tips);
  const mbs = (r: any) => tn(r.mbs) + tn(r.cmbs);

  const mbsOps = (Array.isArray(ambsJ?.ambs?.auctions) ? ambsJ.ambs.auctions : [])
    .filter((a: any) => isDate(a?.operationDate))
    .map((a: any) => ({ date: a.operationDate as string, type: String(a.operationType ?? "Operation"), acceptedBn: num(a.totalAmtAcceptedPar) != null ? num(a.totalAmtAcceptedPar)! / 1e9 : null }));

  return {
    rrp: {
      available: !!rLast,
      date: rLast?.date ?? null,
      totalBn: rLast?.v ?? null,
      counterparties: rLast?.cpty ?? null,
      priorDate: rPrev?.date ?? null,
      priorBn: rPrev?.v ?? null,
      history: rrpHist.map(({ date, v }) => ({ date, v })),
    },
    soma: {
      available: !!last,
      date: last?.asOfDate ?? null,
      totalTn: last ? tn(last.total) : null,
      priorWeekTn: prevW ? tn(prevW.total) : null,
      priorWeekDate: prevW?.asOfDate ?? null,
      yearAgoTn: yearAgo ? tn(yearAgo.total) : null,
      yearAgoDate: yearAgo?.asOfDate ?? null,
      history: yr.map((r: any) => ({ date: r.asOfDate, v: tn(r.total) })),
      treasuriesTn: yr.map((r: any) => ({ date: r.asOfDate, v: treas(r) })),
      mbsTn: yr.map((r: any) => ({ date: r.asOfDate, v: mbs(r) })),
    },
    mbsOps,
  };
});
