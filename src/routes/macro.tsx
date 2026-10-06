import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorRow, Group, LineChart, PageHeader, SkeletonRows, SourceTag, UNAVAILABLE, fmt, shortDate, signed } from "@/components/tape";
import { FlagButton } from "@/components/report-issue";
import { diff, sinceYears, useMacro, valueAt, yoy, type Pt } from "@/components/macro";

export const Route = createFileRoute("/macro")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Macro & Rates — Morning Tape" },
      { name: "description", content: "Treasury yield curve, SOFR, fed funds, inflation, jobs, mortgage rates and diesel from FRED." },
      { property: "og:title", content: "Macro & Rates — Morning Tape" },
      { property: "og:description", content: "Treasury yield curve, SOFR, fed funds, inflation, jobs, mortgage rates and diesel from FRED." },
    ],
  }),
  component: Macro,
});

const CURVE = [["DGS1MO", "1M"], ["DGS3MO", "3M"], ["DGS6MO", "6M"], ["DGS1", "1Y"], ["DGS2", "2Y"], ["DGS5", "5Y"], ["DGS10", "10Y"], ["DGS30", "30Y"]] as const;
const PANEL = ["CPIAUCSL", "CPILFESL", "UNRATE", "PAYEMS", "EFFR", "DFF", "SOFR", "MORTGAGE30US", "GASDESW"] as const;

function Curve({ by }: { by: Map<string, Pt[]> }) {
  const [hover, setHover] = useState<number | null>(null);
  const pts = CURVE.map(([id, label]) => {
    const s = by.get(id) ?? [];
    const latest = s.at(-1);
    let ago: Pt | undefined;
    if (latest) {
      const d = new Date(latest.date + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() - 1);
      ago = valueAt(s, d.toISOString().slice(0, 10));
    }
    return { id, label, latest, ago };
  });
  const vals = pts.flatMap((p) => [p.latest?.value, p.ago?.value]).filter((v): v is number => v != null);
  const latestDate = pts.map((p) => p.latest?.date).filter(Boolean).sort().at(-1);
  const agoDate = pts.map((p) => p.ago?.date).filter(Boolean).sort().at(-1);
  const W = 640, H = 220, P = 28;
  const min = Math.min(...vals) - 0.15, max = Math.max(...vals) + 0.15;
  const x = (i: number) => P + (i / (pts.length - 1)) * (W - 2 * P);
  const y = (v: number) => 12 + (1 - (v - min) / (max - min || 1)) * (H - 44);
  const line = (k: "latest" | "ago") => pts.map((p, i) => (p[k] ? `${x(i)},${y(p[k]!.value)}` : null)).filter(Boolean).join(" ");
  return (
    <section>
      <h2 className="group-label">US Treasury yield curve</h2>
      <div className="group p-4">
        {vals.length < 2 ? <p className="text-muted-foreground">{UNAVAILABLE}</p> : (
          <>
            <div className="mb-2 flex flex-wrap gap-4 text-[13px] text-muted-foreground">
              <span><span className="mr-1.5 inline-block h-0.5 w-4 bg-link align-middle" />Latest{latestDate ? ` (${shortDate(latestDate)})` : ""}</span>
              <span><span className="mr-1.5 inline-block w-4 border-t border-dashed border-muted-foreground align-middle" />1 month earlier{agoDate ? ` (${shortDate(agoDate)})` : ""}</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Treasury yield curve, latest versus one month earlier">
              <polyline points={line("ago")} fill="none" stroke="var(--color-muted-foreground)" strokeWidth="1.25" strokeDasharray="4 4" />
              <polyline points={line("latest")} fill="none" stroke="var(--color-link)" strokeWidth="2" />
              {pts.map((p, i) => (
                <g key={p.id} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onPointerDown={() => setHover(i)}>
                  <rect x={x(i) - 20} y={0} width={40} height={H} fill="transparent" />
                  {p.latest && <circle cx={x(i)} cy={y(p.latest.value)} r={hover === i ? 5 : 3} fill="var(--color-link)" />}
                  <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="12" fill="var(--color-muted-foreground)">{p.label}</text>
                  {hover === i && p.latest && (
                    <text x={Math.min(Math.max(x(i), 60), W - 60)} y={Math.max(y(p.latest.value) - 12, 14)} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-foreground)">
                      {fmt(p.latest.value)}% · {shortDate(p.latest.date)}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </>
        )}
      </div>
      <div className="group mt-4">
        {pts.map((p) => {
          const ch = p.latest && p.ago ? (p.latest.value - p.ago.value) * 100 : null;
          return (
            <div className="row !pr-2" key={p.id}>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{p.label} Treasury</div>
                <SourceTag>FRED {p.id}{p.latest ? ` · ${shortDate(p.latest.date)}` : ""}</SourceTag>
              </div>
              <div className="text-right">
                <div>{p.latest ? `${fmt(p.latest.value)}%` : UNAVAILABLE}</div>
                <div className="text-[13px] text-muted-foreground">{ch == null ? "\u00a0" : `${signed(ch, 0)} bp vs 1 mo ago`}</div>
              </div>
              <FlagButton ctx={{ field: `${p.label} Treasury yield`, displayedValue: p.latest ? `${fmt(p.latest.value)}%` : UNAVAILABLE }} />
            </div>
          );
        })}
      </div>
      <p className="group-footer">Daily constant-maturity yields. Source: U.S. Treasury via FRED.</p>
    </section>
  );
}

type PanelRow = { label: string; pts: Pt[]; fmtV: (v: number) => string; chUnit: string; source: string; monthly?: boolean; chDigits?: number };

function Panel({ by }: { by: Map<string, Pt[]> }) {
  const g = (id: string) => by.get(id) ?? [];
  const effr = g("EFFR").length ? { pts: g("EFFR"), src: "NY Fed via FRED (EFFR)" } : { pts: g("DFF"), src: "Fed via FRED (DFF)" };
  const payrollChg = diff(g("PAYEMS"));
  const pct = (v: number) => `${fmt(v)}%`;
  const rows: PanelRow[] = [
    { label: "CPI inflation, year over year", pts: yoy(g("CPIAUCSL")), fmtV: pct, chUnit: " pp", source: "BLS via FRED (CPIAUCSL)", monthly: true },
    { label: "Core CPI, year over year", pts: yoy(g("CPILFESL")), fmtV: pct, chUnit: " pp", source: "BLS via FRED (CPILFESL)", monthly: true },
    { label: "Unemployment rate", pts: g("UNRATE"), fmtV: (v) => `${fmt(v, 1)}%`, chUnit: " pp", source: "BLS via FRED (UNRATE)", monthly: true, chDigits: 1 },
    { label: "Nonfarm payrolls, monthly change", pts: payrollChg, fmtV: (v) => `${v > 0 ? "+" : ""}${fmt(v, 0)}K`, chUnit: "K", source: "BLS via FRED (PAYEMS)", monthly: true, chDigits: 0 },
    { label: "Effective fed funds rate", pts: effr.pts, fmtV: pct, chUnit: " pp", source: effr.src },
    { label: "SOFR", pts: g("SOFR"), fmtV: pct, chUnit: " pp", source: "NY Fed via FRED (SOFR)" },
    { label: "30-year mortgage rate", pts: g("MORTGAGE30US"), fmtV: pct, chUnit: " pp", source: "Freddie Mac via FRED (MORTGAGE30US)" },
    { label: "US on-highway diesel", pts: g("GASDESW"), fmtV: (v) => `$${fmt(v, 3)}/gal`, chUnit: "", source: "EIA via FRED (GASDESW)", chDigits: 3 },
  ];
  return (
    <Group
      label="Economy"
      footer={<>Change is vs the prior observation. LIBOR ceased on Sep 30, 2024; SOFR and EFFR are used instead. More: <a href="https://www.reuters.com/markets/rates-bonds/" target="_blank" rel="noopener noreferrer">Reuters Rates & Bonds</a> · <a href="https://www.bloomberg.com/markets/rates-bonds/government-bonds/us" target="_blank" rel="noopener noreferrer">Bloomberg US Govt Bonds</a></>}
    >
      {rows.map((r) => {
        const last = r.pts.at(-1), prior = r.pts.at(-2);
        const ch = last && prior ? last.value - prior.value : null;
        const spark = sinceYears(r.pts, 2).map((p) => ({ label: shortDate(p.date, r.monthly), v: p.value }));
        return (
          <div className="row !pr-2 flex-wrap sm:flex-nowrap" key={r.label}>
            <div className="min-w-0 [flex:1_1_100%] sm:[flex:1_1_0%]">
              <div className="font-medium">{r.label}</div>
              <SourceTag>{r.source}{last ? ` · ${shortDate(last.date, r.monthly)}` : ""}</SourceTag>
            </div>
            <div className="w-[110px] shrink-0"><LineChart points={spark} width={110} height={28} format={r.fmtV} label={`${r.label}, 2 years`} /></div>
            <div className="ml-auto text-right">
              <div className={last ? "" : "text-muted-foreground"}>{last ? r.fmtV(last.value) : UNAVAILABLE}</div>
              <div className="text-[13px] text-muted-foreground">
                {prior ? `prior ${r.fmtV(prior.value)}` : "\u00a0"}{ch != null ? ` · ${signed(ch, r.chDigits ?? 2)}${r.chUnit}` : ""}
              </div>
            </div>
            <FlagButton ctx={{ field: r.label, displayedValue: last ? r.fmtV(last.value) : UNAVAILABLE }} />
          </div>
        );
      })}
    </Group>
  );
}

function Macro() {
  const q = useMacro([...CURVE.map((c) => c[0]), ...PANEL]);
  const by = new Map((q.data ?? []).map((s) => [s.id, s.points]));
  return (
    <>
      <PageHeader title="Macro & Rates" subtitle="Federal Reserve Economic Data (FRED). Cached up to 6 hours." />
      {q.isLoading ? (
        <div className="space-y-8"><div className="group"><SkeletonRows rows={8} /></div><div className="group"><SkeletonRows rows={8} /></div></div>
      ) : q.isError ? (
        <div className="group">
          <ErrorRow message={/FRED_API_KEY/.test((q.error as Error).message) ? "economic data source isn't configured yet" : "couldn't reach FRED"} onRetry={() => q.refetch()} />
        </div>
      ) : (
        <div className="space-y-10"><Curve by={by} /><Panel by={by} /></div>
      )}
    </>
  );
}
