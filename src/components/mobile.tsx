import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Ellipsis, Newspaper, Percent, TrendingUp, Wheat } from "lucide-react";
import { BpPill, ChangePill, LineChart, UNAVAILABLE, YIELD_SYMBOLS, etTime, fmt, signed, useHistory, useQuotes } from "./tape";
import { ResponsiveSheet } from "./sheet";
import { FlagButton } from "./report-issue";

/* ---------- Bottom tab bar (mobile only) ---------- */

const TABS = [
  { to: "/", label: "Today", Icon: Newspaper },
  { to: "/markets", label: "Markets", Icon: TrendingUp },
  { to: "/macro", label: "Rates", Icon: Percent },
  { to: "/dairy", label: "Dairy", Icon: Wheat },
  { to: "/more", label: "More", Icon: Ellipsis },
] as const;
const MAIN = new Set(["/", "/markets", "/macro", "/dairy"]);

export function TabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = (to: string) =>
    to === "/" ? path === "/" || path.startsWith("/report/") : to === "/more" ? !MAIN.has(path) && !path.startsWith("/report/") : path === to;
  return (
    <nav aria-label="Tabs" className="tabbar nav-glass fixed inset-x-0 bottom-0 z-40 border-t border-separator md:hidden">
      <ul className="mx-auto grid max-w-[600px] grid-cols-5">
        {TABS.map(({ to, label, Icon }) => {
          const on = active(to);
          return (
            <li key={to}>
              <Link to={to} aria-current={on ? "page" : undefined} className={`tab ${on ? "tab-on" : ""}`}>
                <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** True once the page has scrolled past the large title. */
export function useScrolled(threshold = 28) {
  const [s, set] = useState(false);
  useEffect(() => {
    const on = () => set(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return s;
}

/* ---------- Theme row (More page) ---------- */

type Theme = "system" | "light" | "dark";
export function ThemeRow() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    const t = localStorage.getItem("mt-theme");
    if (t === "light" || t === "dark") setTheme(t);
  }, []);
  const pick = (n: Theme) => {
    setTheme(n);
    const el = document.documentElement;
    el.classList.remove("light", "dark");
    if (n === "system") localStorage.removeItem("mt-theme");
    else { el.classList.add(n); localStorage.setItem("mt-theme", n); }
  };
  return (
    <div className="row">
      <span className="min-w-0 flex-1">Appearance</span>
      <div className="segmented shrink-0" role="group" aria-label="Appearance">
        {(["system", "light", "dark"] as const).map((t) => (
          <button key={t} data-active={theme === t} aria-pressed={theme === t} onClick={() => pick(t)} className="!min-h-[36px] !px-2.5">{t === "system" ? "Auto" : t === "light" ? "Light" : "Dark"}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Key numbers strip ---------- */

const KEYS = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow" },
  { symbol: "^TNX", label: "10-yr yield" },
  { symbol: "CL=F", label: "WTI crude", unit: "$/bbl" },
  { symbol: "DC=F", label: "Class III milk", unit: "$/cwt" },
  { symbol: "ZC=F", label: "Corn", unit: "¢/bu" },
];
const KEY_SYMS = KEYS.map((k) => k.symbol);

export function KeyStrip() {
  const q = useQuotes(KEY_SYMS);
  const h = useHistory(KEY_SYMS);
  const [sel, setSel] = useState<string | null>(null);
  const qBy = new Map((q.data ?? []).map((x) => [x.symbol, x]));
  const hBy = new Map((h.data ?? []).map((x) => [x.symbol, x.points]));
  const pts = (s: string) => (hBy.get(s) ?? []).map((p) => ({ label: new Date(p.t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }), v: p.v }));
  const k = KEYS.find((x) => x.symbol === sel);
  const kq = sel ? qBy.get(sel) : undefined;
  const kok = kq && !kq.error && kq.last != null;
  const isY = sel ? YIELD_SYMBOLS.has(sel) : false;
  const val = (s: string, x = qBy.get(s)) => (x && !x.error && x.last != null ? (YIELD_SYMBOLS.has(s) ? `${fmt(x.last)}%` : fmt(x.last)) : UNAVAILABLE);

  return (
    <section aria-label="Key numbers" className="md:hidden">
      <h2 className="group-label">Key numbers</h2>
      <div className="snap-strip -mx-4 px-4">
        {KEYS.map((key) => {
          const x = qBy.get(key.symbol);
          const ok = x && !x.error && x.last != null;
          const yld = YIELD_SYMBOLS.has(key.symbol);
          const p = pts(key.symbol);
          return (
            <button key={key.symbol} className="key-card" onClick={() => setSel(key.symbol)} aria-label={`${key.label}: ${val(key.symbol)}. Open detail`}>
              <span className="truncate text-[0.8125rem] font-medium">{key.label}</span>
              <span className={`text-[1.0625rem] font-semibold ${ok ? "" : "text-muted-foreground"}`}>{q.isLoading ? <span className="skel w-16" /> : val(key.symbol)}</span>
              <span className="[&_.pill]:min-w-0 [&_.pill]:text-[13px]">{yld ? <BpPill bp={ok && x!.change != null ? x!.change * 100 : null} /> : <ChangePill pct={ok ? x!.changePct : null} />}</span>
              <span className="block h-6 w-full">{p.length > 1 && <LineChart points={p} width={116} height={24} label={`${key.label}, 3 months`} />}</span>
              <span className="truncate text-[0.6875rem] text-muted-foreground">Yahoo{ok && etTime(x!.marketTime) ? ` · ${etTime(x!.marketTime)}` : ""}</span>
            </button>
          );
        })}
      </div>
      <ResponsiveSheet open={!!sel} onOpenChange={(o) => !o && setSel(null)} title={k?.label ?? ""} description={sel ? `${sel} · Yahoo Finance (delayed, unofficial)` : undefined}>
        {sel && (
          <div className="space-y-5 pt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[2rem] font-bold leading-none">{val(sel)}</div>
                <div className="mt-1 text-[15px] text-muted-foreground">
                  {kok ? (isY ? `${signed(kq!.change != null ? Math.round(kq!.change * 100) : null, 0, " bp")} vs prior close` : `${signed(kq!.change)}${k?.unit ? ` ${k.unit}` : ""} vs prior close`) : "\u00a0"}
                </div>
              </div>
              {isY ? <BpPill bp={kok && kq!.change != null ? kq!.change * 100 : null} /> : <ChangePill pct={kok ? kq!.changePct : null} />}
            </div>
            <LineChart points={pts(sel)} width={600} height={160} label={`${k?.label}, 3 months`} showValue />
            <div className="group">
              <div className="row"><span className="flex-1 text-muted-foreground">As of</span><span>{kok ? etTime(kq!.marketTime) ?? UNAVAILABLE : UNAVAILABLE}</span></div>
              <div className="row"><span className="flex-1 text-muted-foreground">Comparison</span><span>Prior close</span></div>
              <div className="row"><span className="flex-1 text-muted-foreground">Chart</span><span>3 months, daily close</span></div>
              <div className="row !pr-2"><span className="flex-1 text-muted-foreground">Source</span><span>Yahoo Finance</span><FlagButton ctx={{ field: `${k?.label} (${sel})`, displayedValue: val(sel) }} /></div>
            </div>
          </div>
        )}
      </ResponsiveSheet>
    </section>
  );
}

/* ---------- Sticky section control for the report ---------- */

export function SectionNav({ items }: { items: { key: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.key);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(`sec-${i.key}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (es) => {
        const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id.slice(4));
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  useEffect(() => {
    bar.current?.querySelector<HTMLElement>(`[data-key="${active}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);
  if (items.length < 2) return null;
  const go = (key: string) => {
    setActive(key);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  return (
    <div className="section-nav nav-glass sticky z-30 -mx-4 px-4 py-2 md:hidden">
      <div ref={bar} className="segmented flex w-full overflow-x-auto" role="group" aria-label="Report sections">
        {items.map((i) => (
          <button key={i.key} data-key={i.key} data-active={active === i.key} aria-pressed={active === i.key} onClick={() => go(i.key)} className="!min-h-[36px] flex-1 justify-center">
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Expandable numbered rows ---------- */

export type BriefItem = { lead: ReactNode; rest: ReactNode; preview: string; sources: { title: string; url: string }[] };

export function BriefList({ items }: { items: BriefItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ol className="group md:hidden">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <li key={i} className="row !block !p-0">
            <button className="row row-action w-full !items-start text-left" aria-expanded={on} onClick={() => setOpen(on ? null : i)}>
              <span className="w-5 shrink-0 font-semibold text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug">{it.lead}</span>
                {!on && <span className="block truncate text-[15px] text-muted-foreground">{it.preview}</span>}
              </span>
              <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${on ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {on && (
              <div className="px-4 pb-3 pl-[52px] text-[15px] leading-relaxed">
                <div>{it.rest}</div>
                {it.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="btn-text !min-h-[44px] text-[15px]">Source: {s.title}</a>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
