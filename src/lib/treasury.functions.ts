import { createServerFn } from "@tanstack/react-start";

// U.S. Treasury daily par yield curve (official, no key). Cached 1 hour in memory.
const COLS: Record<string, string> = {
  "1 Mo": "DGS1MO", "3 Mo": "DGS3MO", "6 Mo": "DGS6MO", "1 Yr": "DGS1",
  "2 Yr": "DGS2", "5 Yr": "DGS5", "10 Yr": "DGS10", "30 Yr": "DGS30",
};
export type CurveSeries = { id: string; points: { date: string; value: number }[] };

let cache: { at: number; v: CurveSeries[] } | null = null;

async function yearCsv(year: number): Promise<string | null> {
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${year}&page&_format=csv`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (MorningTape)" } });
    if (!res.ok) return null;
    const t = await res.text();
    return t.startsWith("Date") ? t : null;
  } catch {
    return null;
  }
}

export async function fetchTreasuryCurve(): Promise<CurveSeries[] | null> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.v;
  const now = new Date();
  const years = [now.getUTCFullYear()];
  if (now.getUTCMonth() < 2) years.unshift(now.getUTCFullYear() - 1);
  const csvs = await Promise.all(years.map(yearCsv));
  if (csvs.some((c) => c == null)) return null;
  const series = new Map<string, { date: string; value: number }[]>(Object.values(COLS).map((id) => [id, []]));
  for (const csv of csvs as string[]) {
    const [head, ...lines] = csv.trim().split(/\r?\n/);
    const cols = head!.split(",").map((c) => c.replace(/"/g, "").trim());
    for (const line of lines) {
      const cells = line.split(",");
      const [m, d, y] = (cells[0] ?? "").split("/");
      if (!m || !d || !y) continue;
      const date = `${y}-${m}-${d}`;
      cols.forEach((c, i) => {
        const id = COLS[c];
        const v = Number(cells[i]);
        if (id && cells[i] !== "" && Number.isFinite(v)) series.get(id)!.push({ date, value: v });
      });
    }
  }
  const out = [...series.entries()].map(([id, pts]) => ({ id, points: pts.sort((a, b) => (a.date < b.date ? -1 : 1)) }));
  if (!out.some((s) => s.points.length)) return null;
  cache = { at: Date.now(), v: out };
  return out;
}

/** Returns null when Treasury is unreachable — caller falls back to FRED. */
export const getTreasuryCurve = createServerFn({ method: "GET" }).handler(() => fetchTreasuryCurve());
