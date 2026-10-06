import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Quote = {
  symbol: string;
  name: string | null;
  last: number | null;
  change: number | null;
  changePct: number | null;
  prevClose: number | null;
  marketTime: number | null;
  error?: string;
};

const cache = new Map<string, { at: number; q: Quote }>();
const TTL = 5 * 60 * 1000;

async function fetchOne(symbol: string): Promise<Quote> {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < TTL) return hit.q;
  const empty: Quote = { symbol, name: null, last: null, change: null, changePct: null, prevClose: null, marketTime: null };
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0 (MorningTape)" } },
    );
    if (!res.ok) return { ...empty, error: `HTTP ${res.status}` };
    const json: any = await res.json();
    const r = json?.chart?.result?.[0];
    if (!r) return { ...empty, error: "no data" };
    const meta = r.meta ?? {};
    const closes: number[] = (r.indicators?.quote?.[0]?.close ?? []).filter((x: unknown) => typeof x === "number");
    const last: number | null = meta.regularMarketPrice ?? closes.at(-1) ?? null;
    const prev: number | null = closes.length >= 2 ? closes[closes.length - 2] : (meta.previousClose ?? meta.chartPreviousClose ?? null);
    const change = last != null && prev != null ? last - prev : null;
    const q: Quote = {
      symbol,
      name: meta.shortName ?? meta.longName ?? null,
      last,
      change,
      changePct: change != null && prev ? (change / prev) * 100 : null,
      prevClose: prev,
      marketTime: meta.regularMarketTime ?? null,
    };
    cache.set(symbol, { at: Date.now(), q });
    return q;
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : "failed" };
  }
}

export const getQuotes = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ symbols: z.array(z.string().min(1).max(20)).max(60) }).parse(d))
  .handler(async ({ data }) => Promise.all(data.symbols.map(fetchOne)));
