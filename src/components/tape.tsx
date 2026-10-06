import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ReactNode } from "react";
import { getHistory, getQuotes, type Quote } from "@/lib/market.functions";
import { FlagButton } from "./report-issue";

export const UNAVAILABLE = "Unavailable";

export const fmt = (n: number | null | undefined, d = 2) =>
  n == null || !isFinite(n) ? UNAVAILABLE : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export const signed = (n: number | null | undefined, d = 2, suf = "") =>
  n == null || !isFinite(n) ? UNAVAILABLE : `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n), d)}${suf}`;

/** "4:00 PM ET" today, otherwise "Oct 2, 4:00 PM ET". */
export function etTime(unix: number | null | undefined) {
  if (!unix) return null;
  const d = new Date(unix * 1000);
  const tz = "America/New_York";
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz });
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz });
  return day === today ? `${time} ET` : `${day}, ${time} ET`;
}
export const shortDate = (iso: string, monthly = false) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", monthly ? { month: "short", year: "numeric", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" });

export function PageHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="large-title">{title}</h1>
      {subtitle && <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function Group({ label, footer, children, className = "" }: { label?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 ${className}`}>
      {label && <h2 className="group-label">{label}</h2>}
      <div className="group">{children}</div>
      {footer && <div className="group-footer">{footer}</div>}
    </section>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="row" key={i}>
          <span className="skel" style={{ width: `${35 + ((i * 23) % 30)}%` }} />
          <span className="skel ml-auto" style={{ width: 64 }} />
        </div>
      ))}
    </div>
  );
}

export function ErrorRow({ message, onRetry }: { message?: string | undefined; onRetry: () => void }) {
  return (
    <div className="row text-[15px]" role="alert">
      <span className="text-muted-foreground">{UNAVAILABLE}{message ? ` — ${message}` : ""}</span>
      <button onClick={onRetry} className="btn-text ml-auto">Retry</button>
    </div>
  );
}

export function ChangePill({ pct }: { pct: number | null | undefined }) {
  if (pct == null || !isFinite(pct)) return <span className="pill pill-flat">{UNAVAILABLE}</span>;
  const cls = pct > 0 ? "pill-up" : pct < 0 ? "pill-down" : "pill-flat";
  return <span className={`pill ${cls}`}>{signed(pct, 2, "%")}</span>;
}

export function SourceTag({ children }: { children: ReactNode }) {
  return <span className="text-[13px] text-muted-foreground">{children}</span>;
}

export function useQuotes(symbols: string[]) {
  const fn = useServerFn(getQuotes);
  return useQuery({
    queryKey: ["quotes", symbols],
    queryFn: () => fn({ data: { symbols } }),
    enabled: symbols.length > 0,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}
export function useHistory(symbols: string[]) {
  const fn = useServerFn(getHistory);
  return useQuery({
    queryKey: ["history", symbols],
    queryFn: () => fn({ data: { symbols } }),
    enabled: symbols.length > 0,
    staleTime: 5 * 60_000,
  });
}

export type Row = { symbol: string; label?: string };

export function QuoteRow({ r, q, after, onClick, reportDate }: { r: Row; q?: Quote | undefined; after?: ReactNode; onClick?: (() => void) | undefined; reportDate?: string | undefined }) {
  const name = r.label ?? q?.name ?? r.symbol;
  const ok = q && !q.error && q.last != null;
  const asOf = ok ? etTime(q!.marketTime) : null;
  const inner = (
    <>
      <div className="min-w-0 text-left [flex:1_1_100%] sm:[flex:1_1_0%]">
        <div className="truncate font-medium">{name}</div>
        <SourceTag>
          {r.symbol} · Yahoo Finance{asOf ? ` · ${asOf}` : ""}
        </SourceTag>
      </div>
      {after}
      <div className="ml-auto text-right">
        <div className={ok ? "" : "text-muted-foreground"}>{ok ? fmt(q!.last) : UNAVAILABLE}</div>
        <div className="text-[13px] text-muted-foreground">{ok ? `${signed(q!.change)} vs prior close` : "\u00a0"}</div>
      </div>
      <ChangePill pct={ok ? q!.changePct : null} />
    </>
  );
  return (
    <div className="row !pr-2">
      {onClick ? (
        <button onClick={onClick} className="-my-2 flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg py-2 text-left sm:flex-nowrap">
          {inner}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">{inner}</div>
      )}
      <FlagButton ctx={{ field: `${name} (${r.symbol})`, displayedValue: ok ? `${fmt(q!.last)} (${signed(q!.changePct, 2, "%")})` : UNAVAILABLE, reportDate }} />
    </div>
  );
}

export function QuoteList({ rows, label, footer, extra, sortable = true }: { rows: Row[]; label?: ReactNode; footer?: ReactNode; extra?: ((r: Row) => ReactNode) | undefined; sortable?: boolean }) {
  const symbols = useMemo(() => rows.map((r) => r.symbol), [rows]);
  const q = useQuotes(symbols);
  const [sort, setSort] = useState<"default" | "pct">("default");
  const bySym = new Map<string, Quote>((q.data ?? []).map((x) => [x.symbol, x]));
  let data = rows;
  if (sort === "pct") data = [...rows].sort((a, b) => (bySym.get(b.symbol)?.changePct ?? -Infinity) - (bySym.get(a.symbol)?.changePct ?? -Infinity));
  return (
    <section className="min-w-0">
      <div className="flex items-end justify-between gap-2">
        {label && <h2 className="group-label">{label}</h2>}
        {sortable && rows.length > 2 && (
          <div className="segmented mb-1.5" role="group" aria-label="Sort">
            <button data-active={sort === "default"} aria-pressed={sort === "default"} onClick={() => setSort("default")}>Default</button>
            <button data-active={sort === "pct"} aria-pressed={sort === "pct"} onClick={() => setSort("pct")}>% change</button>
          </div>
        )}
      </div>
      <div className="group">
        {q.isLoading ? <SkeletonRows rows={Math.min(rows.length, 6)} /> : q.isError ? <ErrorRow message={(q.error as Error)?.message} onRetry={() => q.refetch()} /> : (
          data.map((r) => <QuoteRow key={r.symbol} r={r} q={bySym.get(r.symbol)} after={extra?.(r)} />)
        )}
      </div>
      {footer && <div className="group-footer">{footer}</div>}
    </section>
  );
}

/** Minimal line chart; hover/tap reveals value + date. */
export function LineChart({
  points,
  width = 120,
  height = 32,
  format = (v: number) => fmt(v),
  color = "var(--color-link)",
  showValue = false,
  label,
}: {
  points: { label: string; v: number }[];
  width?: number;
  height?: number;
  format?: (v: number) => string;
  color?: string;
  showValue?: boolean;
  label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <span className="text-[13px] text-muted-foreground">{UNAVAILABLE}</span>;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * width;
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const h = hover != null ? points[hover] : null;
  const move = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const i = Math.round(((clientX - rect.left) / rect.width) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  return (
    <div className="relative inline-block w-full" style={{ maxWidth: width }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full touch-none"
        role="img"
        aria-label={`${label}: ${points.length} points, latest ${format(vals.at(-1)!)} on ${points.at(-1)!.label}`}
        onPointerMove={(e) => move(e.clientX, e.currentTarget)}
        onPointerDown={(e) => move(e.clientX, e.currentTarget)}
        onPointerLeave={() => setHover(null)}
      >
        <path d={d} fill="none" stroke={color} strokeWidth={showValue ? 1.75 : 1.25} vectorEffect="non-scaling-stroke" />
        {hover != null && <circle cx={x(hover)} cy={y(points[hover]!.v)} r={showValue ? 3.5 : 2.5} fill={color} />}
      </svg>
      {h && (
        <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-elevated px-2 py-0.5 text-[13px] shadow">
          {format(h.v)} · {h.label}
        </div>
      )}
    </div>
  );
}
