import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ReactNode } from "react";
import { getQuotes, type Quote } from "@/lib/market.functions";

export const fmt = (n: number | null | undefined, d = 2) =>
  n == null || !isFinite(n) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export const signed = (n: number | null | undefined, d = 2, suf = "") =>
  n == null || !isFinite(n) ? "—" : `${n > 0 ? "+" : ""}${fmt(n, d)}${suf}`;
export const dirClass = (n: number | null | undefined) =>
  n == null || n === 0 ? "" : n > 0 ? "text-up" : "text-down";

export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`label-caps border-t border-rule pt-3 pb-2 ${className}`}>{children}</h2>;
}

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className="skel" style={{ width: `${60 + ((i * 37) % 40)}%` }} />
      ))}
    </div>
  );
}

export function ErrorLine({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <p className="py-2 text-sm text-muted-foreground">
      Couldn't load this{message ? ` (${message})` : ""}.{" "}
      <button onClick={onRetry} className="text-link underline underline-offset-2">Retry</button>
    </p>
  );
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

export type Row = { symbol: string; label?: string };
type SortKey = "name" | "last" | "change" | "changePct";

export function QuoteTable({ rows, footer, extraCol }: { rows: Row[]; footer?: ReactNode; extraCol?: (r: Row) => ReactNode }) {
  const symbols = useMemo(() => rows.map((r) => r.symbol), [rows]);
  const q = useQuotes(symbols);
  const [sort, setSort] = useState<{ k: SortKey; asc: boolean } | null>(null);
  const bySym = new Map<string, Quote>((q.data ?? []).map((x) => [x.symbol, x]));
  let data = rows.map((r) => ({ r, q: bySym.get(r.symbol) }));
  if (sort) {
    data = [...data].sort((a, b) => {
      const va = sort.k === "name" ? (a.r.label ?? a.r.symbol) : (a.q?.[sort.k] ?? -Infinity);
      const vb = sort.k === "name" ? (b.r.label ?? b.r.symbol) : (b.q?.[sort.k] ?? -Infinity);
      const c = va < vb ? -1 : va > vb ? 1 : 0;
      return sort.asc ? c : -c;
    });
  }
  const H = ({ k, children, r }: { k: SortKey; children: ReactNode; r?: boolean }) => (
    <th className={r ? "r" : ""}>
      <button
        className="hover:text-foreground"
        onClick={() => setSort((s) => (s?.k === k ? { k, asc: !s.asc } : { k, asc: k === "name" }))}
      >
        {children}
        {sort?.k === k ? (sort.asc ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
  if (q.isLoading) return <Skeleton rows={Math.min(rows.length, 6)} />;
  if (q.isError) return <ErrorLine message={(q.error as Error)?.message} onRetry={() => q.refetch()} />;
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <H k="name">Name</H>
              <H k="last" r>Last</H>
              <H k="change" r>Chg</H>
              <H k="changePct" r>Chg%</H>
              {extraCol && <th />}
            </tr>
          </thead>
          <tbody>
            {data.map(({ r, q: x }) => (
              <tr key={r.symbol}>
                <td>
                  <span className="font-medium">{r.label ?? x?.name ?? r.symbol}</span>
                  <span className="num ml-2 text-xs text-muted-foreground">{r.symbol}</span>
                </td>
                <td className="r num">{fmt(x?.last)}</td>
                <td className={`r num ${dirClass(x?.change)}`}>{signed(x?.change)}</td>
                <td className={`r num ${dirClass(x?.changePct)}`}>{signed(x?.changePct, 2, "%")}</td>
                {extraCol && <td className="r">{extraCol(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="pt-2 text-xs text-muted-foreground">{footer}</div>}
    </div>
  );
}

export function Sparkline({ values, width = 120, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <span className="text-muted-foreground">—</span>;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / span) * (height - 4)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="text-foreground">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
