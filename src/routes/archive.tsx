import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { listReports } from "@/lib/reports.functions";
import { longDate } from "@/components/report";
import { ErrorRow, Group, PageHeader } from "@/components/tape";

export const Route = createFileRoute("/archive")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Archive — Close & Open" },
      { name: "description", content: "Search every past Close & Open market report by keyword or month." },
      { property: "og:title", content: "Archive — Close & Open" },
      { property: "og:description", content: "Search every past Close & Open market report by keyword or month." },
    ],
  }),
  loader: () => listReports(),
  errorComponent: ArchiveError,
  component: Archive,
});

function Archive() {
  const [term, setTerm] = useState("");
  const [month, setMonth] = useState("");
  const reports = Route.useLoaderData();
  const months = useMemo(() => [...new Set(reports.map((r) => r.report_date.slice(0, 7)))], [reports]);
  const results = useMemo(() => {
    const t = term.trim().toLowerCase();
    return reports.filter((r) =>
      (!month || r.report_date.startsWith(month)) &&
      (!t || `${r.headline}\n${r.summary}\n${r.body_md}`.toLowerCase().includes(t)),
    );
  }, [reports, term, month]);

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
      <Group label={`${results.length} report${results.length === 1 ? "" : "s"}`}>
        {results.length === 0 ? (
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

function ArchiveError() {
  const router = useRouter();
  return <><PageHeader title="Archive" /><div className="group"><ErrorRow onRetry={() => router.invalidate()} /></div></>;
}
