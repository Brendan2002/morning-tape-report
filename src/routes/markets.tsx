import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ErrorRow, Group, PageHeader, QuoteList, QuoteRow, SkeletonRows, SourceTag, UNAVAILABLE, etTime, signed, useQuotes } from "@/components/tape";
import { FlagButton } from "@/components/report-issue";
import type { Quote } from "@/lib/market.functions";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Markets — Morning Tape" },
      { name: "description", content: "Global indices, futures, currencies, commodities, S&P 500 sectors and top movers." },
      { property: "og:title", content: "Markets — Morning Tape" },
      { property: "og:description", content: "Global indices, futures, currencies, commodities, S&P 500 sectors and top movers." },
    ],
  }),
  component: Markets,
});

const s = (symbol: string, label: string) => ({ symbol, label });
const A = (href: string, t: string) => <a href={href} target="_blank" rel="noopener noreferrer">{t}</a>;
const GROUPS = [
  { title: "Americas", more: A("https://www.cnbc.com/us-markets/", "CNBC Americas"), rows: [s("^GSPC", "S&P 500"), s("^IXIC", "Nasdaq Composite"), s("^DJI", "Dow Jones"), s("^RUT", "Russell 2000"), s("^GSPTSE", "S&P/TSX"), s("^BVSP", "Bovespa")] },
  { title: "Europe", more: A("https://www.cnbc.com/europe-markets/", "CNBC Europe"), rows: [s("^STOXX50E", "Euro Stoxx 50"), s("^FTSE", "FTSE 100"), s("^GDAXI", "DAX"), s("^FCHI", "CAC 40")] },
  { title: "Asia", more: A("https://www.cnbc.com/asia-markets/", "CNBC Asia"), rows: [s("^N225", "Nikkei 225"), s("^HSI", "Hang Seng"), s("000001.SS", "Shanghai Composite"), s("^KS11", "KOSPI"), s("^AXJO", "ASX 200")] },
  { title: "Index futures", more: <>{A("https://www.cnbc.com/pre-markets/", "CNBC Futures")} · {A("https://www.bloomberg.com/markets/stocks/futures", "Bloomberg Futures")}</>, rows: [s("ES=F", "S&P 500 futures"), s("NQ=F", "Nasdaq 100 futures"), s("YM=F", "Dow futures"), s("RTY=F", "Russell 2000 futures")] },
  { title: "Currencies", more: A("https://www.bloomberg.com/markets/currencies", "Bloomberg Currencies"), rows: [s("DX-Y.NYB", "Dollar index"), s("EURUSD=X", "EUR/USD"), s("USDJPY=X", "USD/JPY"), s("GBPUSD=X", "GBP/USD"), s("USDCNY=X", "USD/CNY"), s("USDCAD=X", "USD/CAD"), s("BTC-USD", "Bitcoin")] },
  { title: "Commodities", more: A("https://www.wsj.com/market-data/commodities", "WSJ Commodities"), rows: [s("CL=F", "WTI crude"), s("BZ=F", "Brent crude"), s("NG=F", "Natural gas"), s("GC=F", "Gold"), s("SI=F", "Silver"), s("HG=F", "Copper"), s("ZC=F", "Corn"), s("ZW=F", "Wheat")] },
];

const SECTORS = [s("XLK", "Technology"), s("XLF", "Financials"), s("XLE", "Energy"), s("XLV", "Health Care"), s("XLY", "Consumer Discretionary"), s("XLP", "Consumer Staples"), s("XLI", "Industrials"), s("XLB", "Materials"), s("XLU", "Utilities"), s("XLRE", "Real Estate"), s("XLC", "Communication Services")];
const LARGE_CAPS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "BRK-B", "AVGO", "JPM", "LLY", "V", "XOM", "UNH", "MA", "COST", "HD", "PG", "JNJ", "NFLX", "WMT", "ORCL", "BAC", "AMD", "CRM"];

function Sectors() {
  const syms = useMemo(() => SECTORS.map((x) => x.symbol), []);
  const q = useQuotes(syms);
  const by = new Map((q.data ?? []).map((x) => [x.symbol, x]));
  const rows = SECTORS.map((r) => ({ ...r, q: by.get(r.symbol) })).sort((a, b) => (b.q?.changePct ?? -Infinity) - (a.q?.changePct ?? -Infinity));
  const max = Math.max(0.01, ...rows.map((r) => Math.abs(r.q?.changePct ?? 0)));
  const asOf = etTime(rows.find((r) => r.q?.marketTime)?.q?.marketTime);
  return (
    <Group label="S&P 500 sectors" footer={<>Daily % change vs prior close, SPDR sector ETFs · Yahoo Finance{asOf ? ` · ${asOf}` : ""}</>}>
      {q.isLoading ? <SkeletonRows rows={6} /> : q.isError ? <ErrorRow onRetry={() => q.refetch()} /> : rows.map((r) => {
        const p = r.q && !r.q.error ? r.q.changePct : null;
        return (
          <div className="row !pr-2" key={r.symbol}>
            <div className="min-w-0 flex-1 sm:w-[42%] sm:flex-none">
              <div className="truncate text-[15px] font-medium">{r.label}</div>
              <SourceTag>{r.symbol}</SourceTag>
            </div>
            <div className="relative h-4 w-[25%] shrink-0 sm:w-auto sm:flex-1" aria-hidden>
              <div className="absolute inset-y-0 left-1/2 border-l border-separator" />
              {p != null && (
                <div
                  className={`absolute inset-y-0 rounded-sm ${p >= 0 ? "left-1/2 bg-up" : "right-1/2 bg-down"}`}
                  style={{ width: `${(Math.abs(p) / max) * 50}%` }}
                />
              )}
            </div>
            <span className={`w-[72px] text-right text-[15px] font-semibold ${p == null ? "text-muted-foreground" : p >= 0 ? "text-up" : "text-down"}`}>
              {p == null ? UNAVAILABLE : signed(p, 2, "%")}
            </span>
            <FlagButton ctx={{ field: `${r.label} sector (${r.symbol})`, displayedValue: p == null ? UNAVAILABLE : signed(p, 2, "%") }} />
          </div>
        );
      })}
    </Group>
  );
}

function Movers() {
  const q = useQuotes(LARGE_CAPS);
  const valid = (q.data ?? []).filter((x): x is Quote & { changePct: number } => !x.error && x.changePct != null);
  const sorted = [...valid].sort((a, b) => b.changePct - a.changePct);
  const gainers = sorted.filter((x) => x.changePct > 0).slice(0, 5);
  const losers = sorted.filter((x) => x.changePct < 0).reverse().slice(0, 5);
  const footer = `Among ${LARGE_CAPS.length} large-cap US stocks · % change vs prior close · Yahoo Finance`;
  const body = (list: typeof valid, empty: string) =>
    q.isLoading ? <SkeletonRows rows={5} /> : q.isError ? <ErrorRow onRetry={() => q.refetch()} /> : list.length === 0 ? <div className="row text-muted-foreground">{empty}</div> : list.map((x) => <QuoteRow key={x.symbol} r={{ symbol: x.symbol }} q={x} />);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Group label="Top gainers" footer={footer}>{body(gainers, "No gainers in the list.")}</Group>
      <Group label="Top losers" footer={footer}>{body(losers, "No decliners in the list.")}</Group>
    </div>
  );
}

function Markets() {
  return (
    <>
      <PageHeader title="Markets" subtitle="Quotes via Yahoo Finance, may be delayed. Change vs prior close." />
      <div className="space-y-10">
        <Sectors />
        <Movers />
        <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
          {GROUPS.map((g) => <QuoteList key={g.title} label={g.title} rows={g.rows} footer={<>More: {g.more}</>} />)}
        </div>
      </div>
    </>
  );
}
