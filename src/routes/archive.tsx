import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/components/report";
import { ErrorRow, Group, PageHeader, SkeletonRows } from "@/components/tape";

export const Route = createFileRoute("/archive")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Archive — Morning Tape" },
      { name: "description", content: "Search every past Morning Tape market report by keyword or month." },
      { property: "og:title", content: "Archive — Morning Tape" },
      { property: "og:description", content: "Search every past Morning Tape market report by keyword or month." },
    ],
  }),
  component: Archive,
});

function Archive() {
  const [term, setTerm] = useState("");
  const [month, setMonth] = useState("");
  const q = useQuery({
    queryKey: ["reports", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("id, report_date, headline, summary, body_md").order("report_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const months = useMemo(() => [...new Set((q.data ?? []).map((r) => r.report_date.slice(0, 7)))], [q.data]);
  const results = useMemo(() => {
    const t = term.trim().toLowerCase();
    return (q.data ?? []).filter((r) =>
      (!month || r.report_date.startsWith(month)) &&
      (!t || `${r.headline}\n${r.summary}\n${r.body_md}`.toLowerCase().includes(t)),
    );
  }, [q.data, term, month]);

  return (
    <>
      <PageHeader title="Archive" subtitle="Every morning report, newest first." />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search reports</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input type="search" className="field !pl-9" placeholder="Search headlines and report text" value={term} onChange={(e) => setTerm(e.target.value)} maxLength={100} />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Filter by month</span>
          <select className="field" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>{new Date(m + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</option>
            ))}
          </select>
        </label>
      </div>
      <Group label={q.data ? `${results.length} report${results.length === 1 ? "" : "s"}` : "Reports"}>
        {q.isLoading ? <SkeletonRows rows={5} /> : q.isError ? <ErrorRow onRetry={() => q.refetch()} /> : results.length === 0 ? (
          <div className="row text-muted-foreground">No reports match.</div>
        ) : results.map((r) => (
          <Link key={r.id} to="/report/$date" params={{ date: r.report_date }} className="row row-action !items-start text-foreground no-underline">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-muted-foreground">{longDate(r.report_date)}</div>
              <div className="font-semibold">{r.headline}</div>
              <div className="line-clamp-2 text-[15px] text-muted-foreground">{r.summary}</div>
            </div>
            <ChevronRight className="mt-6 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </Group>
    </>
  );
}
