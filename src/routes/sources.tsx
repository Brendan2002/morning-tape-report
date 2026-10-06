import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { domainOf, parseSources } from "@/components/report";
import { FredNotice } from "@/components/legal";
import { NyFedNotice } from "@/components/nyfed";
import { ErrorRow, Group, PageHeader, SkeletonRows, shortDate } from "@/components/tape";

export const Route = createFileRoute("/sources")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Sources & Methodology — Morning Tape" },
      { name: "description", content: "Every source cited in Morning Tape reports, our data providers, and how we handle data." },
      { property: "og:title", content: "Sources & Methodology — Morning Tape" },
      { property: "og:description", content: "Every source cited in Morning Tape reports, our data providers, and how we handle data." },
    ],
  }),
  component: Sources,
});

const PROVIDERS = [
  { name: "Yahoo Finance", body: "Index, futures, currency, commodity and stock quotes. Unofficial and typically delayed 10–20 minutes or more; futures show the front-month contract. Change is vs the prior close/settle." },
  { name: "Federal Reserve Bank of New York", body: "SOFR, EFFR (with the Fed's target range), OBFR, TGCR, BGCR, SOFR averages and index, overnight reverse repo results, SOMA holdings and agency MBS operations, read directly from the NY Fed Markets API." },
  { name: "U.S. Treasury", body: "Official daily par yield curve rates, the primary source for the yield curve. FRED is used only if Treasury's site can't be reached." },
  { name: "FRED (Federal Reserve Bank of St. Louis)", body: "Inflation, jobs and mortgage rates, republished from the original agencies (BLS, Freddie Mac). Fetched fresh, never stored." },
  { name: "EIA (U.S. Energy Information Administration)", body: "Weekly retail on-highway diesel prices for the U.S. and PADD regions, via the EIA API." },
  { name: "USDA AMS Dairy Market News", body: "Announced federal milk order class prices and product averages, and CME cash dairy prices (cheese, butter, nonfat dry milk, dry whey)." },
  { name: "USDA AgTransport", body: "Weekly regional diesel prices and quarterly grain truck rates relevant to agricultural freight." },
];
const RULES = [
  "Every number shows when it was observed (as-of time), what it's compared against, and where it came from.",
  "If a value can't be fetched or confirmed, we show \"Unavailable\" — never an estimate or an old value presented as current.",
  "Quotes are cached for up to 5 minutes; NY Fed, Treasury, EIA and USDA data for up to a few hours; FRED data is fetched fresh and never stored.",
  "No LIBOR: it ceased on Sep 30, 2024. We use SOFR and EFFR.",
];

function Sources() {
  const q = useQuery({
    queryKey: ["reports", "sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("report_date, sources").order("report_date", { ascending: false });
      if (error) throw error;
      const map = new Map<string, { title: string; url: string; count: number; latest: string }>();
      for (const r of data) {
        for (const s of parseSources(r.sources)) {
          const cur = map.get(s.url);
          if (cur) { cur.count++; if (r.report_date > cur.latest) cur.latest = r.report_date; }
          else map.set(s.url, { ...s, count: 1, latest: r.report_date });
        }
      }
      return [...map.values()].sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest));
    },
  });
  return (
    <>
      <PageHeader title="Sources" subtitle="What we cite, where our numbers come from, and the rules we follow." />
      <div className="space-y-10">
        <Group label="Cited in reports" footer="Links open in a new tab.">
          {q.isLoading ? <SkeletonRows rows={4} /> : q.isError ? <ErrorRow onRetry={() => q.refetch()} /> : q.data!.length === 0 ? (
            <div className="row text-muted-foreground">No sources cited yet.</div>
          ) : q.data!.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="row row-action text-foreground no-underline">
              <div className="min-w-0 flex-1">
                <div className="truncate">{s.title}</div>
                <div className="text-[13px] text-muted-foreground">{domainOf(s.url)} · cited in {s.count} report{s.count === 1 ? "" : "s"} · latest {shortDate(s.latest)}</div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          ))}
        </Group>
        <Group label="Data providers">
          {PROVIDERS.map((p) => (
            <div className="row !block" key={p.name}>
              <div className="font-medium">{p.name}</div>
              <p className="text-[15px] text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </Group>
        <Group label="Data notices"><div className="row text-[15px]"><FredNotice /></div><div className="row text-[15px]"><NyFedNotice /></div></Group>
        <Group label="Methodology" footer={<>Found a problem? Use "Report an issue" on any report or the flag on any number. <Link to="/">Back to today</Link></>}>
          {RULES.map((r) => <div className="row text-[15px]" key={r}>{r}</div>)}
        </Group>
      </div>
    </>
  );
}
