import { createFileRoute } from "@tanstack/react-router";
import { QuoteTable, SectionLabel } from "@/components/tape";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Markets — Morning Tape" },
      { name: "description", content: "Global indices, futures, currencies and commodities in dense tables." },
      { property: "og:title", content: "Markets — Morning Tape" },
      { property: "og:description", content: "Global indices, futures, currencies and commodities in dense tables." },
    ],
  }),
  component: Markets,
});

const s = (symbol: string, label: string) => ({ symbol, label });
const GROUPS = [
  { title: "Americas", src: ["CNBC Americas", "https://www.cnbc.com/us-markets/"], rows: [s("^GSPC", "S&P 500"), s("^IXIC", "Nasdaq Composite"), s("^DJI", "Dow Jones"), s("^RUT", "Russell 2000"), s("^GSPTSE", "S&P/TSX"), s("^BVSP", "Bovespa")] },
  { title: "Europe", src: ["CNBC Europe", "https://www.cnbc.com/europe-markets/"], rows: [s("^STOXX50E", "Euro Stoxx 50"), s("^FTSE", "FTSE 100"), s("^GDAXI", "DAX"), s("^FCHI", "CAC 40")] },
  { title: "Asia", src: ["CNBC Asia", "https://www.cnbc.com/asia-markets/"], rows: [s("^N225", "Nikkei 225"), s("^HSI", "Hang Seng"), s("000001.SS", "Shanghai Comp."), s("^KS11", "KOSPI"), s("^AXJO", "ASX 200")] },
  { title: "Index futures", src: ["CNBC Futures · Bloomberg Futures", "https://www.bloomberg.com/markets/stocks/futures"], rows: [s("ES=F", "S&P 500 fut."), s("NQ=F", "Nasdaq 100 fut."), s("YM=F", "Dow fut."), s("RTY=F", "Russell 2000 fut.")] },
  { title: "Currencies", src: ["Bloomberg Currencies", "https://www.bloomberg.com/markets/currencies"], rows: [s("DX-Y.NYB", "Dollar index"), s("EURUSD=X", "EUR/USD"), s("USDJPY=X", "USD/JPY"), s("GBPUSD=X", "GBP/USD"), s("USDCNY=X", "USD/CNY"), s("USDCAD=X", "USD/CAD"), s("BTC-USD", "Bitcoin")] },
  { title: "Commodities", src: ["WSJ Commodities", "https://www.wsj.com/market-data/commodities"], rows: [s("CL=F", "WTI crude"), s("BZ=F", "Brent crude"), s("NG=F", "Natural gas"), s("GC=F", "Gold"), s("SI=F", "Silver"), s("HG=F", "Copper"), s("ZC=F", "Corn"), s("ZW=F", "Wheat")] },
];

function Markets() {
  return (
    <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
      {GROUPS.map((g) => (
        <section key={g.title} className="min-w-0">
          <SectionLabel>{g.title}</SectionLabel>
          <QuoteTable
            rows={g.rows}
            footer={
              g.title === "Index futures" ? (
                <>More: <a href="https://www.cnbc.com/pre-markets/" target="_blank" rel="noreferrer">CNBC Futures</a> · <a href={g.src[1]} target="_blank" rel="noreferrer">Bloomberg Futures</a></>
              ) : (
                <>More: <a href={g.src[1]} target="_blank" rel="noreferrer">{g.src[0]}</a></>
              )
            }
          />
        </section>
      ))}
    </div>
  );
}
