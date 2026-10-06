import { createServerFn } from "@tanstack/react-start";

// Non-FRED agricultural/energy sources. Short in-memory caching of successful responses only.
const cache = new Map<string, { at: number; v: unknown }>();
async function cached<T>(key: string, ttl: number, fn: () => Promise<T | null>): Promise<T | null> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.v as T;
  try {
    const v = await fn();
    if (v != null) cache.set(key, { at: Date.now(), v });
    return v;
  } catch {
    return null;
  }
}
const num = (x: unknown) => (x === "" || x == null ? null : Number.isFinite(Number(x)) ? Number(x) : null);
const HOUR = 3600_000;

/* ---------------- USDA AgTransport (Socrata, no key) ---------------- */

export type Freight = {
  diesel: { available: boolean; week: string | null; rows: { region: string; price: number; prior: number | null }[] };
  truck: { available: boolean; quarter: string | null; rows: { distance: string; rate: number; prior: number | null }[] };
};

export const getFreight = createServerFn({ method: "GET" }).handler(async (): Promise<Freight> => {
  const diesel = await cached("agt-diesel", 6 * HOUR, async () => {
    const res = await fetch("https://agtransport.usda.gov/resource/x88w-atzp.json?$limit=60&$order=date%20DESC");
    if (!res.ok) return null;
    const rows: any[] = await res.json();
    const dates = [...new Set(rows.map((r) => String(r.date ?? "").slice(0, 10)).filter(Boolean))].sort().reverse();
    const [w, p] = dates;
    if (!w) return null;
    const prior = new Map(rows.filter((r) => String(r.date).startsWith(p ?? "x")).map((r) => [r.region, num(r.diesel_price)]));
    const cur = rows.filter((r) => String(r.date).startsWith(w) && num(r.diesel_price) != null)
      .map((r) => ({ region: String(r.region), price: num(r.diesel_price)!, prior: prior.get(r.region) ?? null }));
    return cur.length ? { week: w, rows: cur } : null;
  });
  const truck = await cached("agt-truck", 12 * HOUR, async () => {
    const res = await fetch("https://agtransport.usda.gov/resource/fxkn-2w9c.json?$limit=12&region=National&$order=year%20DESC,quarter%20DESC");
    if (!res.ok) return null;
    const rows: any[] = await res.json();
    const qs = [...new Set(rows.map((r) => String(r.yearquarter ?? "")).filter(Boolean))].sort().reverse();
    const [q, pq] = qs;
    if (!q) return null;
    const prior = new Map(rows.filter((r) => r.yearquarter === pq).map((r) => [r.distance, num(r.rate_mile_trukload)]));
    const cur = rows.filter((r) => r.yearquarter === q && num(r.rate_mile_trukload) != null)
      .map((r) => ({ distance: String(r.distance), rate: num(r.rate_mile_trukload)!, prior: prior.get(r.distance) ?? null }))
      .sort((a, b) => parseInt(a.distance) - parseInt(b.distance));
    return cur.length ? { quarter: q, rows: cur } : null;
  });
  return {
    diesel: diesel ? { available: true, ...diesel } : { available: false, week: null, rows: [] },
    truck: truck ? { available: true, ...truck } : { available: false, quarter: null, rows: [] },
  };
});

/* ---------------- EIA API v2 (EIA_API_KEY) ---------------- */

const PADD: Record<string, string> = {
  NUS: "U.S. average", R10: "East Coast (PADD 1)", R20: "Midwest (PADD 2)", R30: "Gulf Coast (PADD 3)", R40: "Rocky Mountain (PADD 4)", R50: "West Coast (PADD 5)",
};
export type EiaDiesel = { configured: boolean; available: boolean; week: string | null; rows: { area: string; label: string; price: number; prior: number | null }[]; usHistory: { date: string; v: number }[] };

export const getEiaDiesel = createServerFn({ method: "GET" }).handler(async (): Promise<EiaDiesel> => {
  const key = process.env["EIA_API_KEY"];
  if (!key) return { configured: false, available: false, week: null, rows: [], usHistory: [] };
  const data = await cached("eia-diesel", HOUR, async () => {
    const p = new URLSearchParams({ api_key: key, frequency: "weekly", "data[0]": "value", "facets[product][]": "EPD2D", "sort[0][column]": "period", "sort[0][direction]": "desc", length: String(6 * 14) });
    Object.keys(PADD).forEach((a) => p.append("facets[duoarea][]", a));
    const res = await fetch(`https://api.eia.gov/v2/petroleum/pri/gnd/data/?${p}`);
    if (!res.ok) return null;
    const j: any = await res.json();
    const rows: any[] = (j?.response?.data ?? []).filter((r: any) => r.process === "PTE" && num(r.value) != null);
    const weeks = [...new Set(rows.map((r) => r.period as string))].sort().reverse();
    const [w, pw] = weeks;
    if (!w) return null;
    const val = (period: string, area: string) => num(rows.find((r) => r.period === period && r.duoarea === area)?.value);
    const out = Object.keys(PADD).map((a) => ({ area: a, label: PADD[a]!, price: val(w, a), prior: pw ? val(pw, a) : null }))
      .filter((r): r is { area: string; label: string; price: number; prior: number | null } => r.price != null);
    const usHistory = rows.filter((r) => r.duoarea === "NUS").map((r) => ({ date: r.period as string, v: num(r.value)! })).sort((a, b) => (a.date < b.date ? -1 : 1));
    return out.length ? { week: w, rows: out, usHistory } : null;
  });
  return data ? { configured: true, available: true, ...data } : { configured: true, available: false, week: null, rows: [], usHistory: [] };
});

/* ---------------- USDA AMS dairy ---------------- */

export type DairyPrice = { label: string; unit: string; value: number | null; prior: number | null; date: string | null; priorDate: string | null };
export type DairyPrices = {
  classes: { available: boolean; month: string | null; rows: DairyPrice[] };
  cme: { configured: boolean; available: boolean; rows: DairyPrice[] };
};

// Announced Class II–IV prices: public AMS datamart (report 2991, no key).
async function classPrices() {
  return cached("ams-class", 6 * HOUR, async () => {
    const year = new Date().getUTCFullYear();
    const get = async (y: number) => {
      const res = await fetch(`https://mpr.datamart.ams.usda.gov/services/v1.1/reports/2991/Detail?q=report_year=${y}`);
      if (!res.ok) return [];
      const j: any = await res.json();
      return Array.isArray(j?.results) ? j.results : [];
    };
    let rows: any[] = await get(year);
    if (rows.length < 2) rows = [...rows, ...(await get(year - 1))];
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    // The pricing month is report_year + report_month (week_ending_date can fall in the next month).
    const toDate = (r: any) => { const i = MONTHS.indexOf(String(r.report_month ?? "").slice(0, 3)); return r.report_year && i >= 0 ? `${r.report_year}-${String(i + 1).padStart(2, "0")}` : ""; };
    rows = rows.filter((r) => toDate(r)).sort((a, b) => (toDate(a) < toDate(b) ? 1 : -1));
    const [a, b] = rows;
    if (!a) return null;
    const mk = (label: string, k: string, unit: string): DairyPrice => ({ label, unit, value: num(a[k]), prior: b ? num(b[k]) : null, date: toDate(a), priorDate: b ? toDate(b) : null });
    return {
      month: toDate(a),
      rows: [
        mk("Class II", "class_2_Price", "$/cwt"),
        mk("Class III", "class_3_Price", "$/cwt"),
        mk("Class IV", "class_4_Price", "$/cwt"),
        mk("Butter (monthly avg)", "butter_monthly_avg_Price", "$/lb"),
        mk("Cheese (monthly avg)", "cheese_monthly_avg_Price", "$/lb"),
        mk("Nonfat dry milk (monthly avg)", "nfdm_monthly_avg_Price", "$/lb"),
        mk("Dry whey (monthly avg)", "whey_monthly_avg_Price", "$/lb"),
      ],
    };
  });
}

// CME cash dairy prices: USDA AMS MARS (USDA_MARS_API_KEY). Report IDs from MARS catalog.
const CME_REPORTS = [
  { id: 1601, label: "Cheese (CME cash)", unit: "$/lb" },
  { id: 1599, label: "Butter (CME cash)", unit: "$/lb" },
  { id: 1600, label: "Nonfat dry milk (CME cash)", unit: "$/lb" },
  { id: 1610, label: "Dry whey (CME cash)", unit: "$/lb" },
];
async function cmePrices(key: string): Promise<DairyPrice[]> {
  const auth = "Basic " + btoa(`${key}:`);
  const out: DairyPrice[] = [];
  for (const r of CME_REPORTS) {
    const rows = await cached(`mars-${r.id}`, HOUR, async () => {
      const res = await fetch(`https://marsapi.ams.usda.gov/services/v1.2/reports/${r.id}?allSections=true`, { headers: { Authorization: auth } });
      if (!res.ok) return null;
      const j: any = await res.json();
      const list = Array.isArray(j) ? j.flatMap((s: any) => s?.results ?? []) : (j?.results ?? []);
      return Array.isArray(list) && list.length ? list : null;
    });
    // Each row may be a product line (e.g. cheese blocks/barrels) with a closing price.
    const priced = (rows ?? []).map((x: any) => ({
      date: String(x.report_date ?? x.report_end_date ?? "").slice(0, 10),
      name: [x.commodity, x.class, x.variety, x.type].filter(Boolean).join(" "),
      v: num(x.closing_price ?? x.close ?? x.price ?? x.weighted_average ?? x.avg_price),
    })).filter((x: any) => x.v != null && x.date);
    if (!priced.length) { out.push({ label: r.label, unit: r.unit, value: null, prior: null, date: null, priorDate: null }); continue; }
    const names = [...new Set(priced.map((x: any) => x.name))];
    for (const n of names) {
      const s = priced.filter((x: any) => x.name === n).sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
      out.push({ label: names.length > 1 ? `${r.label} — ${n}` : r.label, unit: r.unit, value: s[0]!.v, prior: s[1]?.v ?? null, date: s[0]!.date, priorDate: s[1]?.date ?? null });
    }
  }
  return out;
}

export const getDairyPrices = createServerFn({ method: "GET" }).handler(async (): Promise<DairyPrices> => {
  const key = process.env["USDA_MARS_API_KEY"];
  const [cls, cme] = await Promise.all([classPrices(), key ? cmePrices(key).catch(() => []) : Promise.resolve([])]);
  return {
    classes: cls ? { available: true, ...cls } : { available: false, month: null, rows: [] },
    cme: { configured: !!key, available: cme.some((r) => r.value != null), rows: cme },
  };
});

/* ---------------- USDA AMS DataMart (LMPR/DPMRP/FMMOS, no key) ---------------- */

const DM = "https://mpr.datamart.ams.usda.gov/services/v1.1/reports";
const MONTHS3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const mdyToIso = (s: unknown) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s ?? "")); return m ? `${m[3]}-${m[1]}-${m[2]}` : ""; };
const isoToMdy = (d: Date) => `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}/${d.getUTCFullYear()}`;
const numC = (x: unknown) => num(typeof x === "string" ? x.replace(/,/g, "") : x);
async function dmGet(path: string): Promise<any[]> {
  const res = await fetch(`${DM}/${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const j: any = await res.json();
  return Array.isArray(j?.results) ? j.results : [];
}

export type OfficialWeekly = { label: string; value: number | null; prior: number | null; date: string | null; priorDate: string | null; history: { date: string; v: number }[] };
export type OfficialMonthly = { label: string; value: number | null; prior: number | null; month: string | null; priorMonth: string | null };
export type OfficialDairy = {
  products: { available: boolean; rows: OfficialWeekly[] };
  classes: { available: boolean; month: string | null; rows: OfficialMonthly[] };
  advanced: { available: boolean; month: string | null; rows: OfficialMonthly[] };
};

const DPMRP = [
  { label: "Cheddar blocks (40 lb)", section: "40 Pound Block Cheddar Cheese Prices and Sales", key: "cheese_40_Price" },
  { label: "Cheddar barrels (500 lb)", section: "500 Pound Barrel Cheddar Cheese Prices, Sales, and Moisture Content", key: "cheese_500_Price" },
  { label: "Butter", section: "Butter Prices and Sales", key: "Butter_Price" },
  { label: "Nonfat dry milk", section: "Nonfat Dry Milk Prices and Sales", key: "nonfat_milk_Price" },
  { label: "Dry whey", section: "Dry Whey Prices and Sales", key: "whey_Price" },
];

async function dpmrp(): Promise<OfficialWeekly[] | null> {
  return cached("dm-2993", 6 * HOUR, async () => {
    const end = new Date(); const start = new Date(end.getTime() - 140 * 86400_000);
    const range = `week_ending_date=${isoToMdy(start)}:${isoToMdy(end)}`;
    const out: OfficialWeekly[] = [];
    for (const p of DPMRP) { // sequential: light request volume
      const rows = await dmGet(`2993/${encodeURIComponent(p.section)}?q=${range}`);
      // Newer reports revise earlier weeks: keep the value from the newest report per data week.
      const byWeek = new Map<string, { rep: string; v: number }>();
      for (const r of rows) {
        const wk = mdyToIso(r["Week Ending Date"]), rep = mdyToIso(r.week_ending_date), v = numC(r[p.key]);
        if (!wk || !rep || v == null) continue;
        const cur = byWeek.get(wk);
        if (!cur || rep > cur.rep) byWeek.set(wk, { rep, v });
      }
      const hist = [...byWeek.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, x]) => ({ date, v: x.v })).slice(-12);
      const last = hist.at(-1), prev = hist.at(-2);
      out.push({ label: p.label, value: last?.v ?? null, prior: prev?.v ?? null, date: last?.date ?? null, priorDate: prev?.date ?? null, history: hist });
    }
    return out.some((r) => r.value != null) ? out : null;
  });
}

async function fmmo(slug: string, section: string, fields: { label: string; key: string }[]) {
  return cached(`dm-${slug}`, 6 * HOUR, async () => {
    const year = new Date().getUTCFullYear();
    const ym = (r: any) => { const i = MONTHS3.indexOf(String(r.report_month ?? "").slice(0, 3)); return r.report_year && i >= 0 ? `${r.report_year}-${String(i + 1).padStart(2, "0")}` : ""; };
    const avg = (rows: any[]) => rows.filter((r) => r.MarketingArea === "All Market Average" && ym(r));
    let rows = avg(await dmGet(`${slug}/${encodeURIComponent(section)}?q=report_year=${year}`));
    if (rows.length < 2) rows = [...rows, ...avg(await dmGet(`${slug}/${encodeURIComponent(section)}?q=report_year=${year - 1}`))];
    rows.sort((a, b) => (ym(a) < ym(b) ? 1 : -1));
    const [a, b] = rows;
    if (!a) return null;
    return {
      month: ym(a),
      rows: fields.map((f) => ({ label: f.label, value: numC(a[f.key]), prior: b ? numC(b[f.key]) : null, month: ym(a), priorMonth: b ? ym(b) : null })),
    };
  });
}

export const getOfficialDairy = createServerFn({ method: "GET" }).handler(async (): Promise<OfficialDairy> => {
  const products = await dpmrp().catch(() => null);
  const classes = await fmmo("3355", "Final Class Prices by Order", [
    { label: "Class I", key: "ClassIWhole" }, { label: "Class II", key: "ClassIIWhole" },
    { label: "Class III", key: "ClassIIIWhole" }, { label: "Class IV", key: "ClassIVWhole" },
  ]).catch(() => null);
  const advanced = await fmmo("3354", "Advanced Class Prices by Order", [
    { label: "Advanced Class I", key: "Price_Whole" },
  ]).catch(() => null);
  return {
    products: products ? { available: true, rows: products } : { available: false, rows: [] },
    classes: classes ? { available: true, ...classes } : { available: false, month: null, rows: [] },
    advanced: advanced ? { available: true, ...advanced } : { available: false, month: null, rows: [] },
  };
});
