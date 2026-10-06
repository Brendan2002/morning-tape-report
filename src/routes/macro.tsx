import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMacro, type Series } from "@/lib/macro.functions";
import { ErrorLine, SectionLabel, Skeleton, Sparkline, fmt } from "@/components/tape";

export const Route = createFileRoute("/macro")({
  head: () => ({
    meta: [
      { title: "Macro & Rates — Morning Tape" },
      { name: "description", content: "US Treasury curve, SOFR, Fed funds, unemployment and CPI from FRED." },
      { property: "og:title", content: "Macro & Rates — Morning Tape" },
      { property: "og:description", content: "US Treasury curve, SOFR, Fed funds, unemployment and CPI from FRED." },
    ],
  }),
  component: Macro,
});

const CURVE = [["DGS1MO", "1M"], ["DGS3MO", "3M"], ["DGS2", "2Y"], ["DGS5", "5Y"], ["DGS10", "10Y"], ["DGS30", "30Y"]] as const;
const IDS = [...CURVE.map((c) => c[0]), "SOFR", "DFF", "UNRATE", "CPIAUCSL"];

const twoYears = (pts: Series["points"]) => {
  const cut = new Date(); cut.setFullYear(cut.getFullYear() - 2);
  const c = cut.toISOString().slice(0, 10);
  return pts.filter((p) => p.date >= c);
};

function Macro() {
  const fn = useServerFn(getMacro);
  const q = useQuery({ queryKey: ["macro"], queryFn: () => fn({ data: { ids: IDS } }), staleTime: 60 * 60_000 });
  if (q.isLoading) return <Skeleton rows={10} />;
  if (q.isError) return <ErrorLine message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  const by = new Map(q.data!.map((s) => [s.id, s.points]));
  const last = (id: string) => by.get(id)?.at(-1);

  // 2s10s spread
  const d2 = new Map((by.get("DGS2") ?? []).map((p) => [p.date, p.value]));
  const spread = (by.get("DGS10") ?? []).filter((p) => d2.has(p.date)).map((p) => ({ date: p.date, value: p.value - d2.get(p.date)! }));
  // CPI YoY
  const cpi = by.get("CPIAUCSL") ?? [];
  const cpiYoy = cpi.slice(12).map((p, i) => ({ date: p.date, value: (p.value / cpi[i].value - 1) * 100 }));

  const rows: { label: string; pts: Series["points"]; unit: string; note?: string }[] = [
    { label: "SOFR", pts: by.get("SOFR") ?? [], unit: "%", note: "LIBOR was discontinued in 2023; SOFR is its replacement." },
    { label: "Fed funds (effective)", pts: by.get("DFF") ?? [], unit: "%" },
    { label: "2s10s spread", pts: spread, unit: " pp" },
    { label: "Unemployment rate", pts: by.get("UNRATE") ?? [], unit: "%" },
    { label: "CPI, year over year", pts: cpiYoy, unit: "%" },
  ];

  const curve = CURVE.map(([id, label]) => ({ label, v: last(id)?.value ?? null }));
  const vals = curve.map((c) => c.v).filter((v): v is number => v != null);
  const W = 320, H = 120, min = Math.min(...vals) - 0.2, max = Math.max(...vals) + 0.2;

  return (
    <div className="space-y-10">
      <section>
        <SectionLabel>US Treasury curve</SectionLabel>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Tenor</th><th className="r">Yield</th><th className="r">Prior</th><th className="r">Date</th></tr></thead>
              <tbody>
                {CURVE.map(([id, label]) => {
                  const p = by.get(id) ?? [];
                  return (
                    <tr key={id}>
                      <td className="font-medium">{label}</td>
                      <td className="r num">{fmt(p.at(-1)?.value)}%</td>
                      <td className="r num text-muted-foreground">{fmt(p.at(-2)?.value)}%</td>
                      <td className="r num text-muted-foreground">{p.at(-1)?.date ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {vals.length > 1 && (
            <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full max-w-[340px] text-foreground" role="img" aria-label="Yield curve">
              <line x1="0" x2={W} y1={H} y2={H} stroke="var(--color-rule)" />
              <polyline
                fill="none" stroke="currentColor" strokeWidth="1.25"
                points={curve.map((c, i) => c.v == null ? "" : `${10 + (i / (curve.length - 1)) * (W - 20)},${H - ((c.v - min) / (max - min)) * (H - 10)}`).join(" ")}
              />
              {curve.map((c, i) => (
                <text key={c.label} x={10 + (i / (curve.length - 1)) * (W - 20)} y={H + 14} textAnchor="middle" className="num" fontSize="10" fill="var(--color-muted-foreground)">{c.label}</text>
              ))}
            </svg>
          )}
        </div>
      </section>

      <section>
        <SectionLabel>Rates & macro</SectionLabel>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Series</th><th className="r">Last</th><th className="r">Prior</th><th className="r">Date</th><th>2-year</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="font-medium">{r.label}</td>
                  <td className="r num">{fmt(r.pts.at(-1)?.value)}{r.unit}</td>
                  <td className="r num text-muted-foreground">{fmt(r.pts.at(-2)?.value)}{r.unit}</td>
                  <td className="r num text-muted-foreground">{r.pts.at(-1)?.date ?? "—"}</td>
                  <td><Sparkline values={twoYears(r.pts).map((p) => p.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pt-2 text-xs text-muted-foreground">LIBOR was discontinued in 2023; SOFR is its replacement. Source: FRED, Federal Reserve Bank of St. Louis.</p>
        <p className="pt-1 text-xs text-muted-foreground">
          More: <a href="https://www.reuters.com/markets/rates-bonds/" target="_blank" rel="noreferrer">Reuters Rates & Bonds</a> ·{" "}
          <a href="https://www.bloomberg.com/markets/rates-bonds/government-bonds/us" target="_blank" rel="noreferrer">Bloomberg US Govt Bonds</a> ·{" "}
          <a href="https://www.bloomberg.com/quote/USURTOT:IND" target="_blank" rel="noreferrer">Bloomberg USURTOT</a>
        </p>
      </section>
    </div>
  );
}
