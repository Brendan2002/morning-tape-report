import { Fragment, type ReactNode } from "react";
import { QuoteTable, SectionLabel } from "./tape";

export type Report = {
  id: string;
  report_date: string;
  headline: string;
  summary: string;
  body_md: string;
  sources: { title: string; url: string }[] | unknown;
};

export const TAPE = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow" },
  { symbol: "^RUT", label: "Russell 2000" },
  { symbol: "ES=F", label: "S&P fut." },
  { symbol: "NQ=F", label: "Nasdaq fut." },
  { symbol: "^TNX", label: "10Y yield" },
  { symbol: "DX-Y.NYB", label: "DXY" },
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "CL=F", label: "WTI" },
  { symbol: "GC=F", label: "Gold" },
  { symbol: "BTC-USD", label: "Bitcoin" },
];

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
      out.push(<a key={i++} href={mm[2]} target="_blank" rel="noreferrer">{mm[1]}</a>);
    } else out.push(<em key={i++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function Markdown({ src }: { src: string }) {
  const blocks = src.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="report-body">
      {blocks.map((b, i) => {
        const lines = b.split("\n"); const first = lines[0] ?? "";
        return (
          <Fragment key={i}>
            {first.startsWith("#") && <h2>{first.replace(/^#+\s*/, "")}</h2>}
            {(() => {
              const rest = first.startsWith("#") ? lines.slice(1) : lines;
              if (!rest.length) return null;
              if (rest.every((l) => /^[-*]\s/.test(l)))
                return <ul>{rest.map((l, j) => <li key={j}>{inline(l.replace(/^[-*]\s/, ""))}</li>)}</ul>;
              return <p>{inline(rest.join(" "))}</p>;
            })()}
          </Fragment>
        );
      })}
    </div>
  );
}

export const longDate = (d: string) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export function ReportView({ report }: { report: Report }) {
  const sources = Array.isArray(report.sources) ? (report.sources as { title: string; url: string }[]) : [];
  const head = (
    <header className="pb-6">
      <p className="label-caps">Morning report · {longDate(report.report_date)}</p>
      <h1 className="mt-2 font-serif text-[28px] font-semibold leading-tight md:text-[40px]">{report.headline}</h1>
      <p className="mt-3 max-w-[68ch] font-serif text-[20px] italic leading-snug text-muted-foreground">{report.summary}</p>
    </header>
  );
  const rail = (
    <aside>
      <SectionLabel>The Tape</SectionLabel>
      <QuoteTable rows={TAPE} />
    </aside>
  );
  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
      <article className="min-w-0">
        {head}
        <div className="mb-8 md:hidden">{rail}</div>
        <Markdown src={report.body_md} />
        {sources.length > 0 && (
          <section className="mt-8 max-w-[68ch]">
            <SectionLabel>Sources</SectionLabel>
            <ul className="space-y-1">
              {sources.map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{s.title}</a></li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <div className="hidden min-w-0 md:block">{rail}</div>
    </div>
  );
}
