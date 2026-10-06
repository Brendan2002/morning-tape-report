import { useEffect, useRef, useState } from "react";

/**
 * Official TradingView embed widgets (client-side, lazy-loaded when scrolled into view).
 * Theme follows our light/dark setting and re-renders when it changes. TradingView's attribution link stays visible.
 */

export const TV_LABEL = "Live quotes by TradingView (may be delayed)";

function currentTheme(): "light" | "dark" {
  const c = document.documentElement.classList;
  if (c.contains("dark")) return "dark";
  if (c.contains("light")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useColorTheme() {
  const [t, setT] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const on = () => setT(currentTheme());
    on();
    const mo = new MutationObserver(on);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", on);
    return () => { mo.disconnect(); mq.removeEventListener("change", on); };
  }, []);
  return t;
}

type WidgetType = "market-quotes" | "ticker-tape" | "mini-symbol-overview" | "stock-heatmap" | "hotlists" | "symbol-overview";

export function TVWidget({ type, config, height, label = "TradingView widget" }: { type: WidgetType; config: Record<string, unknown>; height: number; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const theme = useColorTheme();
  const cfg = JSON.stringify(config);

  useEffect(() => {
    const el = box.current;
    if (!el || visible) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    const el = box.current;
    if (!el || !visible || !theme) return;
    el.innerHTML = "";
    const w = document.createElement("div");
    w.className = "tradingview-widget-container__widget";
    const s = document.createElement("script");
    s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${type}.js`;
    s.async = true;
    s.type = "text/javascript";
    s.textContent = JSON.stringify({ ...JSON.parse(cfg), colorTheme: theme, isTransparent: true, locale: "en" });
    el.append(w, s);
    return () => { el.innerHTML = ""; };
  }, [visible, theme, type, cfg]);

  return (
    <div className="tv-wrap min-w-0 max-w-full overflow-hidden" aria-label={label}>
      <div ref={box} className="tradingview-widget-container w-full" style={{ minHeight: height }} />
      <div className="tradingview-widget-copyright text-[0.75rem] text-muted-foreground">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">Track all markets on TradingView</a>
      </div>
    </div>
  );
}

export type TVSym = { s: string; d: string };
export type TVGroup = { name: string; symbols: TVSym[] };

export function MarketQuotes({ groups, height }: { groups: TVGroup[]; height?: number }) {
  const rows = groups.reduce((n, g) => n + g.symbols.length + 1, 0);
  const h = height ?? Math.min(900, 60 + rows * 46);
  return (
    <TVWidget
      type="market-quotes"
      height={h}
      label="Live quotes"
      config={{
        width: "100%", height: h, showSymbolLogo: false,
        symbolsGroups: groups.map((g) => ({ name: g.name, symbols: g.symbols.map((x) => ({ name: x.s, displayName: x.d })) })),
      }}
    />
  );
}

export function TickerTape({ symbols }: { symbols: TVSym[] }) {
  return <TVWidget type="ticker-tape" height={46} label="Key numbers ticker" config={{ symbols: symbols.map((x) => ({ proName: x.s, title: x.d })), showSymbolLogo: false, displayMode: "adaptive" }} />;
}

export function MiniChart({ symbol, height = 220 }: { symbol: string; height?: number }) {
  return <TVWidget type="mini-symbol-overview" height={height} label={`${symbol} chart`} config={{ symbol, width: "100%", height, dateRange: "3M", autosize: false, largeChartUrl: "", noTimeScale: false }} />;
}

export const CFD_NOTE = "CFD = a broker's contract-for-difference price that tracks the market; it is not the official exchange quote or settlement.";

/** Symbols used on Today (desktop sidebar + mobile ticker). Exchange futures and Treasury yields aren't available to free widgets, so they're omitted. */
export const KEY_TV: TVSym[] = [
  { s: "FOREXCOM:SPXUSD", d: "S&P 500 (CFD)" },
  { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100 (CFD)" },
  { s: "FOREXCOM:DJI", d: "Dow (CFD)" },
  { s: "TVC:USOIL", d: "WTI crude" },
  { s: "TVC:GOLD", d: "Gold" },
  { s: "FX:EURUSD", d: "EUR/USD" },
  { s: "CAPITALCOM:DXY", d: "Dollar index (CFD)" },
  { s: "CAPITALCOM:CORN", d: "Corn (CFD)" },
];
