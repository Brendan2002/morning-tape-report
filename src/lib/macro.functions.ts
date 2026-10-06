import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Series = { id: string; points: { date: string; value: number }[]; error?: string };

// FRED API terms: no caching or storing of FRED data — fetched fresh on every request.

// Only series the site actually displays may be fetched with the server's FRED key.
export const ALLOWED_FRED_SERIES = [
  "DGS1MO", "DGS3MO", "DGS6MO", "DGS1", "DGS2", "DGS5", "DGS10", "DGS30",
  "SOFR", "EFFR", "DFF", "UNRATE", "CPIAUCSL", "CPILFESL", "PAYEMS", "MORTGAGE30US", "GASDESW",
] as const;
const ALLOWED = new Set<string>(ALLOWED_FRED_SERIES);

export async function fetchFredSeries(ids: string[]): Promise<Series[]> {
  ids = [...new Set(ids)].filter((id) => ALLOWED.has(id));
  const key = process.env["FRED_API_KEY"];
  if (!key) throw new Error("FRED_API_KEY is not configured");
  const start = new Date();
  start.setFullYear(start.getFullYear() - 3);
  const startStr = start.toISOString().slice(0, 10);
  return Promise.all(
    ids.map(async (id): Promise<Series> => {
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(id)}&api_key=${key}&file_type=json&observation_start=${startStr}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return { id, points: [], error: `HTTP ${res.status}` };
        const j: any = await res.json();
        const points = (j.observations ?? [])
          .filter((o: any) => o.value !== ".")
          .map((o: any) => ({ date: o.date, value: Number(o.value) }));
        const s = { id, points };
        return s;
      } catch (e) {
        return { id, points: [], error: e instanceof Error ? e.message : "failed" };
      }
    }),
  );
}

export const getMacro = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ids: z.array(z.enum(ALLOWED_FRED_SERIES)).max(ALLOWED_FRED_SERIES.length) }).parse(d))
  .handler(async ({ data }) => fetchFredSeries(data.ids));
