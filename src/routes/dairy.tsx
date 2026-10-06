import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { ErrorRow, Group, LineChart, PageHeader, SkeletonRows, SourceTag, fmt, shortDate, signed } from "@/components/tape";
import { CFD_NOTE, MarketQuotes, MiniChart, TV_LABEL } from "@/components/tradingview";
import { FlagButton } from "@/components/report-issue";
import { ResponsiveSheet } from "@/components/sheet";
import { sinceYears, useMacro } from "@/components/macro";
import { DairyPricesGroups, OfficialDairyGroup, EiaDieselGroup, FreightGroup, useEiaDiesel } from "@/components/ag";

export const Route = createFileRoute("/dairy")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Dairy & Feed — Close & Open" },
      { name: "description", content: "Class III milk, corn, soybeans, soybean meal, wheat, diesel and live cattle prices." },
      { property: "og:title", content: "Dairy & Feed — Close & Open" },
      { property: "og:description", content: "Class III milk, corn, soybeans, soybean meal, wheat, diesel and live cattle prices." },
    ],
  }),
  component: Dairy,
});

// Exchange futures (CME/CBOT/NYMEX) aren't available to free TradingView widgets; broker CFD prices are shown and labelled.
// Class III milk and soybean meal have no free-widget equivalent and are omitted (official USDA dairy prices are above).
const ITEMS = [
  { s: "CAPITALCOM:CORN", d: "Corn (CFD)", unit: "¢/bu" },
  { s: "CAPITALCOM:SOYBEAN", d: "Soybeans (CFD)", unit: "¢/bu" },
  { s: "CAPITALCOM:WHEAT", d: "Wheat (CFD)", unit: "¢/bu" },
  { s: "CAPITALCOM:LIVECATTLE", d: "Live cattle (CFD)", unit: "¢/lb" },
  { s: "CAPITALCOM:HEATINGOIL", d: "Heating oil / ULSD (CFD, diesel proxy)", unit: "$/gal" },
]

type Detail = {
  origin?: { x: number; y: number }; title: string; points?: { label: string; v: number }[]; format?: (v: number) => string; source: string; tv?: string };

function Dairy() {
  const m = useMacro(["GASDESW"]);
  const eia = useEiaDiesel();
  const [detail, setDetail] = useState<Detail | null>(null);
  const diesel = m.data?.[0]?.points ?? [];
  const dLast = diesel.at(-1), dPrior = diesel.at(-2);
  const dSpark = sinceYears(diesel, 0.25).map((p) => ({ label: shortDate(p.date), v: p.value }));

  return (
    <>
      <PageHeader title="Dairy & Feed" subtitle="Official USDA, EIA and FRED prices, plus feed and fuel prices by TradingView (may be delayed)." />
      <div className="space-y-10">
        <OfficialDairyGroup />
        <section className="min-w-0">
          <h2 className="group-label">Feed &amp; fuel prices</h2>
          <div className="group px-2 py-2"><MarketQuotes groups={[{ name: "Feed & fuel", symbols: ITEMS }]} /></div>
          <div className="group-footer">{TV_LABEL}. {CFD_NOTE} Heating oil is a proxy for ULSD/diesel. Class III milk and soybean meal futures aren&apos;t available in free widgets.</div>
        </section>
        <Group label="Charts" footer="Tap a row for a 3-month chart by TradingView.">
          {ITEMS.map((it) => (
            <button key={it.s} className="row row-action w-full text-left" onClick={(e) => setDetail({ origin: { x: e.clientX, y: e.clientY }, title: it.d, source: `${it.s} · ${it.unit} · ${TV_LABEL}`, tv: it.s })}>
              <span className="min-w-0 flex-1"><span className="block font-medium">{it.d}</span><SourceTag>{it.s} · {it.unit}</SourceTag></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </Group>

        <DairyPricesGroups />
        {eia.data?.available ? <EiaDieselGroup data={eia.data} /> : (
        <Group label="Retail diesel" footer="Weekly U.S. No. 2 diesel retail price, all types. Change vs prior week. EIA direct data unavailable; shown via FRED.">
          {m.isLoading ? <SkeletonRows rows={1} /> : m.isError || !dLast ? (
            <ErrorRow message={m.isError && /FRED_API_KEY/.test((m.error as Error).message) ? "economic data source isn't configured yet" : undefined} onRetry={() => m.refetch()} />
          ) : (
            <div className="row !pr-2">
              <button
                className="-my-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 text-left"
                onClick={(e) => setDetail({ origin: { x: e.clientX, y: e.clientY }, title: "US on-highway diesel", points: dSpark, format: (v) => `$${fmt(v, 3)}/gal`, source: "EIA via FRED (GASDESW) · weekly" })}
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
        )}
        <FreightGroup />
      </div>

      <ResponsiveSheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={detail?.title ?? ""} description={detail?.source} origin={detail?.origin}>
        {detail && (
          <div className="pt-6">
            {detail.tv ? <MiniChart symbol={detail.tv} height={240} /> : detail.points && detail.format && (
              <>
                <LineChart points={detail.points} width={560} height={220} format={detail.format} showValue label={`${detail.title}, 3 months`} />
                <div className="mt-3 flex justify-between text-[13px] text-muted-foreground">
                  <span>{detail.points[0]?.label}</span>
                  <span>Latest {detail.format(detail.points.at(-1)!.v)} · {detail.points.at(-1)?.label}</span>
                </div>
              </>
            )}
          </div>
        )}
      </ResponsiveSheet>
    </>
  );
}
