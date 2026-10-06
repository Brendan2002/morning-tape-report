import { type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import { Group } from "./tape";
import { CFD_NOTE, KEY_TV, MarketQuotes, TV_LABEL } from "./tradingview";
import { BriefList, KeyStrip, SectionNav, type BriefItem } from "./mobile";
import { useReportIssue } from "./report-issue";

export type Source = { title: string; url: string };
export type Report = {
  id: string;
  report_date: string;
  headline: string;
  summary: string;
  body_md: string;
  sources: unknown;
  created_at: string;
};

export function LiveMarkets() {
  return (
    <section className="min-w-0">
      <h2 className="group-label">Live markets</h2>
      <div className="group px-2 py-2"><MarketQuotes groups={[{ name: "Key markets", symbols: KEY_TV }]} /></div>
      <div className="group-footer">{TV_LABEL}. {CFD_NOTE} Treasury yields: see Macro &amp; Rates.</div>
    </section>
  );
}

export const parseSources = (s: unknown): Source[] =>
  Array.isArray(s) ? s.filter((x): x is Source => !!x && typeof x.url === "string" && typeof x.title === "string") : [];
export const domainOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={i++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("[")) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!;
      out.push(<a key={i++} href={mm[2]} target="_blank" rel="noopener noreferrer">{mm[1]}</a>);
    } else out.push(<em key={i++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

function MdTable({ lines }: { lines: string[] }) {
  const head = cells(lines[0]!);
  const body = lines.slice(2).map(cells);
  return (
    <div className="my-4">
      {/* Desktop: table */}
      <div className="group hidden md:block">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="text-left text-[13px] uppercase tracking-[0.02em] text-muted-foreground">
              {head.map((h, i) => <th key={i} className={`px-4 py-2 font-normal ${i ? "text-right" : ""}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {body.map((r, i) => (
              <tr key={i} className="border-t border-separator">
                {r.map((c, j) => <td key={j} className={`px-4 py-2.5 ${j ? "text-right" : "font-medium"}`}>{inline(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile: grouped lists by region (market tables), otherwise one grouped list */}
      {/^market$/i.test(head[0] ?? "") && head.length >= 3 ? <RegionLists head={head} body={body} /> : (
      <div className="group md:hidden">
        {body.map((r, i) => (
          <div className="row !items-start" key={i}>
            <div className="font-medium">{inline(r[0] ?? "")}</div>
            <dl className="ml-auto text-right text-[15px]">
              {r.slice(1).map((c, j) => (
                <div key={j}><dt className="sr-only">{head[j + 1]}</dt><dd><span className="text-[13px] text-muted-foreground">{head[j + 1]} </span>{inline(c)}</dd></div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

const REGIONS: [string, RegExp][] = [
  ["Rates", /treasury|yield|sofr|effr|fed funds|bund|gilt|\bbp\b/i],
  ["FX", /dxy|dollar|eur|usd|jpy|gbp|cny|\//i],
  ["Commodities", /crude|wti|brent|gold|silver|copper|corn|soy|wheat|cattle|hog|milk|gas|oil|diesel|bitcoin/i],
  ["Europe & futures", /futures|stoxx|dax|cac|ftse|ibex|europe|mib/i],
  ["Asia", /nikkei|shanghai|hang seng|kospi|asx|sensex|nifty|taiex|topix|csi/i],
  ["US", /s&p|nasdaq|dow|russell|nyse/i],
];
const regionOf = (name: string) => REGIONS.find(([, re]) => re.test(name))?.[0] ?? "Other";
const ORDER = ["US", "Asia", "Europe & futures", "Rates", "FX", "Commodities", "Other"];

function RegionLists({ head, body }: { head: string[]; body: string[][] }) {
  const by = new Map<string, string[][]>();
  body.forEach((r) => { const k = regionOf(r[0] ?? ""); by.set(k, [...(by.get(k) ?? []), r]); });
  return (
    <div className="space-y-6 md:hidden">
      {ORDER.filter((k) => by.has(k)).map((k) => (
        <Group key={k} label={k}>
          {by.get(k)!.map((r, i) => (
            <div className="row !items-start" key={i}>
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-snug">{inline(r[0] ?? "")}</div>
                <div className="text-[13px] text-muted-foreground">{r.slice(3).map((c, j) => <span key={j}>{j ? " · " : ""}{inline(c)}</span>)}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="sr-only">{head[1]}</div><div>{inline(r[1] ?? "")}</div>
                <div className="sr-only">{head[2]}</div><div className="text-[13px] text-muted-foreground">{inline(r[2] ?? "")}</div>
              </div>
            </div>
          ))}
        </Group>
      ))}
    </div>
  );
}

const SECTION_KEYS: [string, string, RegExp][] = [
  ["brief", "Brief", /what mattered|brief/i],
  ["snapshot", "Snapshot", /snapshot/i],
  ["why", "Why", /why|our read|means/i],
  ["calendar", "Calendar", /calendar|ahead|watch/i],
  ["business", "Business", /business|dairy|farm|agri/i],
];
type Sec = { key: string; label: string; title: string | null; md: string };
function splitSections(src: string): Sec[] {
  const out: Sec[] = [];
  let cur: Sec = { key: "intro", label: "", title: null, md: "" };
  for (const line of src.replace(/\r/g, "").split("\n")) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) {
      if (cur.md.trim() || cur.title) out.push(cur);
      const title = m[1]!.trim();
      const hit = SECTION_KEYS.find(([k, , re]) => re.test(title) && !out.some((o) => o.key === k));
      cur = { key: hit?.[0] ?? `s${out.length}`, label: hit?.[1] ?? "", title, md: "" };
    } else cur.md += line + "\n";
  }
  if (cur.md.trim() || cur.title) out.push(cur);
  return out;
}

function briefItems(md: string): BriefItem[] | null {
  const items = md.split("\n").filter((l) => /^\d+\.\s/.test(l.trim())).map((l) => l.trim().replace(/^\d+\.\s+/, ""));
  if (items.length < 2) return null;
  return items.map((t) => {
    const lm = /^\*\*([^*]+)\*\*\s*(.*)$/.exec(t);
    const lead = lm ? lm[1]! : t.split(/(?<=\.)\s/)[0]!;
    let rest = lm ? lm[2]! : t.slice(lead.length).trim();
    const sources: { title: string; url: string }[] = [];
    rest = rest.replace(/\s*\[([^\]]+)\]\((https?:[^)]+)\)\s*$/g, (_, title, url) => { sources.push({ title, url }); return ""; });
    const preview = rest.replace(/\*\*|\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    return { lead: inline(lead), rest: inline(rest), preview, sources };
  });
}

const MD_COMPONENTS: Components = {
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
  h1: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 mb-2 text-[1.0625rem] font-semibold">{children}</h3>,
};

/** Report markdown: GFM via react-markdown; tables use our desktop table / mobile grouped list. */
export function Markdown({ src }: { src: string }) {
  const lines = src.replace(/\r/g, "").split("\n");
  const parts: { md?: string; table?: string[] }[] = [];
  let buf: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim().startsWith("|") && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? "")) {
      const t: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) t.push(lines[i++]!);
      i--;
      if (buf.length) parts.push({ md: buf.join("\n") }); buf = [];
      parts.push({ table: t });
    } else buf.push(lines[i]!);
  }
  if (buf.length) parts.push({ md: buf.join("\n") });
  return (
    <div className="report-body">
      {parts.map((p, i) => p.table ? <MdTable key={i} lines={p.table} /> : (
        <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{p.md!}</ReactMarkdown>
      ))}
    </div>
  );
}

export const longDate = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export function ReportView({ report }: { report: Report }) {
  const open = useReportIssue();
  const sources = parseSources(report.sources);
  const published = new Date(report.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  const sections = splitSections(report.body_md);
  const navItems = sections.filter((x) => x.label).map((x) => ({ key: x.key, label: x.label }));
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <article className="min-w-0">
        <header className="mb-6 flex flex-col">
          <h1 className="large-title report-headline order-2 mt-1 md:order-1 md:mt-0">{report.headline}</h1>
          <p className="order-1 text-[13px] text-muted-foreground md:order-2 md:mt-2 md:text-[15px]">
            {longDate(report.report_date)} · as of {published} ET<span className="max-md:hidden"> · covers the prior trading session</span>
          </p>
          <p className="order-3 mt-3 max-w-[68ch] text-[1.0625rem] leading-normal text-foreground md:mt-4 md:text-[20px] md:leading-snug md:text-muted-foreground">{report.summary}</p>
        </header>
        <div className="mb-4 md:hidden"><KeyStrip /></div>
        <SectionNav items={navItems} />
        <div className="report-body">
          {sections.map((sec) => {
            const brief = sec.key === "brief" ? briefItems(sec.md) : null;
            return (
              <section key={sec.key} id={`sec-${sec.key}`} className="report-section">
                {sec.title && <h2>{sec.title}</h2>}
                {brief ? (
                  <>
                    <BriefList items={brief} />
                    <div className="max-md:hidden"><Markdown src={sec.md} /></div>
                  </>
                ) : <Markdown src={sec.md} />}
              </section>
            );
          })}
        </div>
        <div className="mt-10 max-w-[68ch] space-y-8">
          <Group label="Sources" footer="Links open in a new tab.">
            {sources.length === 0 ? (
              <div className="row text-muted-foreground">No sources listed for this report.</div>
            ) : (
              sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="row row-action text-foreground no-underline">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{s.title}</div>
                    <div className="text-[13px] text-muted-foreground">{domainOf(s.url)}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              ))
            )}
          </Group>
          <button className="btn-text" onClick={() => open({ reportDate: report.report_date, field: "Report text" })}>
            Report an issue
          </button>
        </div>
      </article>
      <aside className="min-w-0 max-md:hidden">
        <LiveMarkets />
      </aside>
    </div>
  );
}
