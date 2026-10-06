import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { ChangePill, ErrorRow, Group, LineChart, PageHeader, SkeletonRows, SourceTag, UNAVAILABLE, etTime, fmt, shortDate, signed, useHistory, useQuotes } from "@/components/tape";
import { FlagButton } from "@/components/report-issue";
import { ResponsiveSheet } from "@/components/sheet";
import { sinceYears, useMacro } from "@/components/macro";

export const Route = createFileRoute("/dairy")({
  head: () => ({
    meta: [
      { title: "Dairy & Feed — Morning Tape" },
      { name: "description", content: "Class III milk, corn, soybeans, soybean meal, wheat, diesel and live cattle prices." },
      { property: "og:title", content: "Dairy & Feed — Morning Tape" },
      { property: "og:description", content: "Class III milk, corn, soybeans, soybean meal, wheat, diesel and live cattle prices." },
    ],
  }),
  component: Dairy,
});

const ITEMS = [
  { symbol: "DC=F", label: "Class III milk", unit: "$/cwt" },
  { symbol: "ZC=F", label: "Corn", unit: "¢/bu" },
  { symbol: "ZS=F", label: "Soybeans", unit: "¢/bu" },
  { symbol: "ZM=F", label: "Soybean meal", unit: "$/short ton" },
  { symbol: "ZW=F", label: "Wheat", unit: "¢/bu" },
  { symbol: "HO=F", label: "Heating oil / ULSD (diesel proxy)", unit: "$/gal" },
  { symbol: "LE=F", label: "Live cattle", unit: "¢/lb" },
];
const SYMS = ITEMS.map((i) => i.symbol);

type Detail = { title: string; points: { label: string; v: number }[]; format: (v: number) => string; source: string };

function Dairy() {
  const q = useQuotes(SYMS);
  const h = useHistory(SYMS);
  const m = useMacro(["GASDESW"]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const qBy = new Map((q.data ?? []).map((x) => [x.symbol, x]));
  const hBy = new Map((h.data ?? []).map((x) => [x.symbol, x.points]));
  const diesel = m.data?.[0]?.points ?? [];
  const dLast = diesel.at(-1), dPrior = diesel.at(-2);
  const dSpark = sinceYears(diesel, 0.25).map((p) => ({ label: shortDate(p.date), v: p.value }));

  return (
    <>
      <PageHeader title="Dairy & Feed" subtitle="Front-month futures via Yahoo Finance (delayed). Change vs prior settle. Tap a row for a 3-month chart." />
      <div className="space-y-10">
        <Group label="Futures" footer="Settlement and quotes are unofficial and may be delayed. Heating oil (HO) is shown as a proxy for ULSD/diesel.">
          {q.isLoading ? <SkeletonRows rows={7} /> : q.isError ? <ErrorRow onRetry={() => q.refetch()} /> : ITEMS.map((it) => {
            const x = qBy.get(it.symbol);
            const ok = x && !x.error && x.last != null;
            const pts = (hBy.get(it.symbol) ?? []).map((p) => ({ label: new Date(p.t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }), v: p.v }));
            const asOf = ok ? etTime(x!.marketTime) : null;
            return (
              <div className="row !pr-2" key={it.symbol}>
                <button
                  className="-my-2 flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg py-2 text-left sm:flex-nowrap"
                  onClick={() => pts.length > 1 && setDetail({ title: it.label, points: pts, format: (v) => `${fmt(v)} ${it.unit}`, source: `${it.symbol} · Yahoo Finance · 3 months, daily close` })}
                  aria-label={`${it.label}: open 3-month chart`}
                >
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <div className="font-medium">{it.label}</div>
                    <SourceTag>{it.symbol} · Yahoo Finance{asOf ? ` · ${asOf}` : ""}</SourceTag>
                  </div>
                  <div className="w-[96px] shrink-0">
                    {h.isLoading ? <span className="skel" /> : <LineChart points={pts} width={96} height={28} label={`${it.label}, 3 months`} />}
                  </div>
                  <div className="ml-auto text-right">
                    <div className={ok ? "" : "text-muted-foreground"}>{ok ? fmt(x!.last) : UNAVAILABLE}</div>
                    <div className="text-[13px] text-muted-foreground">{ok ? `${signed(x!.change)} · ${it.unit}` : "\u00a0"}</div>
                  </div>
                  <ChangePill pct={ok ? x!.changePct : null} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
                <FlagButton ctx={{ field: `${it.label} (${it.symbol})`, displayedValue: ok ? fmt(x!.last) : UNAVAILABLE }} />
              </div>
            );
          })}
        </Group>

        <Group label="Retail diesel" footer="Weekly U.S. No. 2 diesel retail price, all types. Change vs prior week.">
          {m.isLoading ? <SkeletonRows rows={1} /> : m.isError || !dLast ? (
            <ErrorRow message={m.isError && /FRED_API_KEY/.test((m.error as Error).message) ? "economic data source isn't configured yet" : undefined} onRetry={() => m.refetch()} />
          ) : (
            <div className="row !pr-2">
              <button
                className="-my-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 text-left"
                onClick={() => setDetail({ title: "US on-highway diesel", points: dSpark, format: (v) => `$${fmt(v, 3)}/gal`, source: "EIA via FRED (GASDESW) · weekly" })}
                aria-label="US on-highway diesel: open 3-month chart"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium">US on-highway diesel</div>
                  <SourceTag>EIA via FRED · {shortDate(dLast.date)}</SourceTag>
                </div>
                <div className="hidden w-[96px] shrink-0 sm:block"><LineChart points={dSpark} width={96} height={28} label="Diesel, 3 months" format={(v) => `$${fmt(v, 3)}`} /></div>
                <div className="text-right">
                  <div>${fmt(dLast.value, 3)}/gal</div>
                  <div className="text-[13px] text-muted-foreground">{dPrior ? `${signed(dLast.value - dPrior.value, 3)} vs prior week` : "\u00a0"}</div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
              <FlagButton ctx={{ field: "US on-highway diesel (GASDESW)", displayedValue: `$${fmt(dLast.value, 3)}/gal` }} />
            </div>
          )}
        </Group>
      </div>

      <ResponsiveSheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={detail?.title ?? ""} description={detail?.source}>
        {detail && (
          <div className="pt-8">
            <LineChart points={detail.points} width={560} height={220} format={detail.format} showValue label={`${detail.title}, 3 months`} />
            <div className="mt-3 flex justify-between text-[13px] text-muted-foreground">
              <span>{detail.points[0]?.label}</span>
              <span>Latest {detail.format(detail.points.at(-1)!.v)} · {detail.points.at(-1)?.label}</span>
            </div>
          </div>
        )}
      </ResponsiveSheet>
    </>
  );
}
