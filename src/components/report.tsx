import { type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import { Group, QuoteList } from "./tape";
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

export const TAPE = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow" },
  { symbol: "^RUT", label: "Russell 2000" },
  { symbol: "ES=F", label: "S&P 500 futures" },
  { symbol: "NQ=F", label: "Nasdaq 100 futures" },
  { symbol: "^TNX", label: "10-yr Treasury yield" },
  { symbol: "DX-Y.NYB", label: "Dollar index" },
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "CL=F", label: "WTI crude" },
  { symbol: "GC=F", label: "Gold" },
  { symbol: "BTC-USD", label: "Bitcoin" },
];

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
      {/* Mobile: grouped list */}
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
    </div>
  );
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
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <article className="min-w-0">
        <header className="mb-6">
          <h1 className="large-title">{report.headline}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {longDate(report.report_date)} · as of {published} ET · covers the prior trading session
          </p>
          <p className="mt-4 max-w-[68ch] text-[20px] leading-snug text-muted-foreground">{report.summary}</p>
        </header>
        <Markdown src={report.body_md} />
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
      <aside className="min-w-0">
        <QuoteList label="Live markets" rows={TAPE} sortable={false} compact footer="Quotes may be delayed. Change vs prior close; yields in basis points." />
      </aside>
    </div>
  );
}
