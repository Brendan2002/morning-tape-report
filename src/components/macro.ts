import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMacro, type Series } from "@/lib/macro.functions";

export type Pt = Series["points"][number];

export function useMacro(ids: string[]) {
  const fn = useServerFn(getMacro);
  return useQuery({
    queryKey: ["macro", ids],
    queryFn: () => fn({ data: { ids } }),
    staleTime: 60 * 60_000,
    retry: 1,
  });
}

/** Year-over-year % change for a monthly series. */
export const yoy = (pts: Pt[]): Pt[] => {
  const byMonth = new Map(pts.map((p) => [p.date.slice(0, 7), p.value]));
  return pts.flatMap((p) => {
    const y = Number(p.date.slice(0, 4)) - 1;
    const prev = byMonth.get(`${y}${p.date.slice(4, 7)}`);
    return prev ? [{ date: p.date, value: (p.value / prev - 1) * 100 }] : [];
  });
};
export const diff = (pts: Pt[]): Pt[] => pts.slice(1).map((p, i) => ({ date: p.date, value: p.value - pts[i]!.value }));
export const valueAt = (pts: Pt[], date: string) => {
  let v: Pt | undefined;
  for (const p of pts) { if (p.date <= date) v = p; else break; }
  return v;
};
export const sinceYears = (pts: Pt[], years: number) => {
  const c = new Date(); c.setFullYear(c.getFullYear() - years);
  const s = c.toISOString().slice(0, 10);
  return pts.filter((p) => p.date >= s);
};
