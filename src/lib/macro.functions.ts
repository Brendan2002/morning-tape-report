import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Series = { id: string; points: { date: string; value: number }[]; error?: string };

const cache = new Map<string, { at: number; s: Series }>();
const TTL = 6 * 60 * 60 * 1000;

export async function fetchFredSeries(ids: string[]): Promise<Series[]> {
  const key = process.env["FRED_API_KEY"];
  if (!key) throw new Error("FRED_API_KEY is not configured");
  const start = new Date();
  start.setFullYear(start.getFullYear() - 3);
  const startStr = start.toISOString().slice(0, 10);
  return Promise.all(
    ids.map(async (id): Promise<Series> => {
      const hit = cache.get(id);
      if (hit && Date.now() - hit.at < TTL) return hit.s;
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json&observation_start=${startStr}`;
        const res = await fetch(url);
        if (!res.ok) return { id, points: [], error: `HTTP ${res.status}` };
        const j: any = await res.json();
        const points = (j.observations ?? [])
          .filter((o: any) => o.value !== ".")
          .map((o: any) => ({ date: o.date, value: Number(o.value) }));
        const s = { id, points };
        cache.set(id, { at: Date.now(), s });
        return s;
      } catch (e) {
        return { id, points: [], error: e instanceof Error ? e.message : "failed" };
      }
    }),
  );
}

export const getMacro = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ids: z.array(z.string().regex(/^[A-Z0-9]{2,20}$/)).max(20) }).parse(d))
  .handler(async ({ data }) => fetchFredSeries(data.ids));
