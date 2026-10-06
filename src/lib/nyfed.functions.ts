import { createServerFn } from "@tanstack/react-start";

export type NyFedRate = {
  id: "SOFR" | "EFFR";
  available: boolean;
  rate: number | null;
  effectiveDate: string | null; // as-of, from the API
  priorRate: number | null;
  priorDate: string | null;
  change: number | null; // our calculation: rate - priorRate, percentage points
  source: "NY Fed";
};

const URLS = {
  SOFR: "https://markets.newyorkfed.org/api/rates/secured/sofr/last/2.json",
  EFFR: "https://markets.newyorkfed.org/api/rates/unsecured/effr/last/2.json",
} as const;

// Only successful responses are cached, for 1 hour. After expiry a failed call
// returns "unavailable" — an old value is never carried forward.
const cache = new Map<string, { at: number; r: NyFedRate }>();
const TTL = 60 * 60 * 1000;

const unavailable = (id: NyFedRate["id"]): NyFedRate => ({
  id, available: false, rate: null, effectiveDate: null, priorRate: null, priorDate: null, change: null, source: "NY Fed",
});

export async function fetchNyFedRate(id: NyFedRate["id"]): Promise<NyFedRate> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.r;
  try {
    const res = await fetch(URLS[id], { headers: { Accept: "application/json" } });
    if (!res.ok) return unavailable(id);
    const j: any = await res.json();
    const rows = (Array.isArray(j?.refRates) ? j.refRates : [])
      .filter((x: any) => typeof x?.percentRate === "number" && /^\d{4}-\d{2}-\d{2}$/.test(x?.effectiveDate ?? ""))
      .sort((a: any, b: any) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
    const [cur, prev] = rows;
    if (!cur) return unavailable(id);
    const r: NyFedRate = {
      id,
      available: true,
      rate: cur.percentRate,
      effectiveDate: cur.effectiveDate,
      priorRate: prev ? prev.percentRate : null,
      priorDate: prev ? prev.effectiveDate : null,
      change: prev ? Math.round((cur.percentRate - prev.percentRate) * 1000) / 1000 : null,
      source: "NY Fed",
    };
    cache.set(id, { at: Date.now(), r });
    return r;
  } catch {
    return unavailable(id);
  }
}

export const getNyFedRates = createServerFn({ method: "GET" }).handler(async () =>
  Promise.all([fetchNyFedRate("SOFR"), fetchNyFedRate("EFFR")]),
);
