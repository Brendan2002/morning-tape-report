import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/tape";
import { CFD_NOTE, MarketQuotes, TVWidget, TV_LABEL, type TVGroup } from "@/components/tradingview";

export const Route = createFileRoute("/markets")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Markets — Close & Open" },
      { name: "description", content: "Global indices, futures, currencies, commodities, S&P 500 sector heatmap and top movers." },
      { property: "og:title", content: "Markets — Close & Open" },
      { property: "og:description", content: "Global indices, futures, currencies, commodities, S&P 500 sector heatmap and top movers." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://closeandopen.com/markets" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://closeandopen.com/markets" }],
  }),
  component: Markets,
});

const GROUPS: TVGroup[] = [
  { name: "Indices", symbols: [
    { s: "FOREXCOM:SPXUSD", d: "S&P 500 (CFD)" }, { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100 (CFD)" }, { s: "FOREXCOM:DJI", d: "Dow (CFD)" },
    { s: "INDEX:DEU40", d: "DAX" }, { s: "FOREXCOM:UKXGBP", d: "FTSE 100" }, { s: "INDEX:NKY", d: "Nikkei 225" }, { s: "INDEX:HSI", d: "Hang Seng" },
  ] },
  { name: "Currencies", symbols: [
    { s: "CAPITALCOM:DXY", d: "Dollar index (CFD)" }, { s: "FX:EURUSD", d: "EUR/USD" }, { s: "FX:USDJPY", d: "USD/JPY" }, { s: "FX:GBPUSD", d: "GBP/USD" },
    { s: "FX_IDC:USDCNY", d: "USD/CNY" }, { s: "BITSTAMP:BTCUSD", d: "Bitcoin" },
  ] },
  { name: "Commodities", symbols: [
    { s: "TVC:USOIL", d: "WTI crude" }, { s: "TVC:UKOIL", d: "Brent crude" }, { s: "TVC:GOLD", d: "Gold" }, { s: "TVC:SILVER", d: "Silver" },
    { s: "CAPITALCOM:CORN", d: "Corn (CFD)" }, { s: "CAPITALCOM:WHEAT", d: "Wheat (CFD)" },
  ] },
];

function Section({ label, footer, children }: { label: string; footer?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <h2 className="group-label">{label}</h2>
      <div className="group px-2 py-2">{children}</div>
      <div className="group-footer">{footer ?? TV_LABEL}</div>
    </section>
  );
}

function Markets() {
  return (
    <>
      <PageHeader title="Markets" subtitle={`${TV_LABEL}. Change vs prior close.`} />
      <div className="space-y-10">
        <Section label="S&P 500 heatmap" footer={`Sized by market cap, colored by daily % change. ${TV_LABEL}.`}>
          <TVWidget type="stock-heatmap" height={460} label="S&P 500 heatmap" config={{
            exchanges: [], dataSource: "SPX500", grouping: "sector", blockSize: "market_cap_basic", blockColor: "change",
            symbolUrl: "", hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true, hasSymbolTooltip: true, isMonoSize: false,
            width: "100%", height: 460,
          }} />
        </Section>
        <Section label="Top movers (US)" footer={`Gainers, losers and most active US stocks. ${TV_LABEL}.`}>
          <TVWidget type="hotlists" height={560} label="Top movers" config={{ dateRange: "1D", exchange: "US", showChart: true, largeChartUrl: "", showSymbolLogo: false, showFloatingTooltip: false, width: "100%", height: 560 }} />
        </Section>
        <Section label="Global markets" footer={`${TV_LABEL}. ${CFD_NOTE} Index futures and Treasury yields aren't available in TradingView's free widgets; see Macro & Rates for official Treasury yields.`}>
          <MarketQuotes groups={GROUPS} height={620} />
        </Section>
      </div>
    </>
  );
}
