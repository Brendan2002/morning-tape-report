import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Quote = {
  symbol: string;
  name: string | null;
  last: number | null;
  change: number | null;
  changePct: number | null;
  prevClose: number | null;
  marketTime: number | null; // unix seconds
  error?: string;
};

export type History = { symbol: string; points: { t: number; v: number }[]; error?: string };

const qCache = new Map<string, { at: number; q: Quote }>();
const hCache = new Map<string, { at: number; h: History }>();
const TTL = 5 * 60 * 1000;
const STALE_SECONDS = 5 * 24 * 3600; // older than 5 days → treat as unavailable

async function yahoo(symbol: string, range: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
    { headers: { "User-Agent": "Mozilla/5.0 (MorningTape)" } },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: any = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error("no data");
  return r;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const hit = qCache.get(symbol);
  if (hit && Date.now() - hit.at < TTL) return hit.q;
  const empty: Quote = { symbol, name: null, last: null, change: null, changePct: null, prevClose: null, marketTime: null };
  try {
    const r = await yahoo(symbol, "5d");
    const meta = r.meta ?? {};
    const closes: number[] = (r.indicators?.quote?.[0]?.close ?? []).filter((x: unknown) => typeof x === "number");
    const last: number | null = meta.regularMarketPrice ?? closes.at(-1) ?? null;
    const prev: number | null = closes.length >= 2 ? closes[closes.length - 2]! : null;
    const mt: number | null = meta.regularMarketTime ?? null;
    if (last == null || mt == null || Date.now() / 1000 - mt > STALE_SECONDS) {
      return { ...empty, error: "unavailable" };
    }
    const change = prev != null ? last - prev : null;
    const q: Quote = {
      symbol,
      name: meta.shortName ?? meta.longName ?? null,
      last,
      change,
      changePct: change != null && prev ? (change / prev) * 100 : null,
      prevClose: prev,
      marketTime: mt,
    };
    qCache.set(symbol, { at: Date.now(), q });
    return q;
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : "failed" };
  }
}

export async function fetchHistory(symbol: string): Promise<History> {
  const hit = hCache.get(symbol);
  if (hit && Date.now() - hit.at < TTL) return hit.h;
  try {
    const r = await yahoo(symbol, "3mo");
    const ts: number[] = r.timestamp ?? [];
    const closes: (number | null)[] = r.indicators?.quote?.[0]?.close ?? [];
    const points = ts
      .map((t, i) => ({ t, v: closes[i] }))
      .filter((p): p is { t: number; v: number } => typeof p.v === "number");
    const h = { symbol, points };
    hCache.set(symbol, { at: Date.now(), h });
    return h;
  } catch (e) {
    return { symbol, points: [], error: e instanceof Error ? e.message : "failed" };
  }
}

const symbolsSchema = z.object({ symbols: z.array(z.string().min(1).max(20)).max(60) });

export const getQuotes = createServerFn({ method: "POST" })
  .inputValidator((d) => symbolsSchema.parse(d))
  .handler(async ({ data }) => Promise.all(data.symbols.map(fetchQuote)));

export const getHistory = createServerFn({ method: "POST" })
  .inputValidator((d) => symbolsSchema.parse(d))
  .handler(async ({ data }) => Promise.all(data.symbols.map(fetchHistory)));
