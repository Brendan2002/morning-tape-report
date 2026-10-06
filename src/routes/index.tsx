import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportView, TAPE, type Report } from "@/components/report";
import { ErrorRow, PageHeader, QuoteList, SkeletonRows } from "@/components/tape";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Daily Stock Market Recap — Close & Open" },
      { name: "description", content: "Today's morning market report: the prior trading day's recap and what it means." },
      { property: "og:title", content: "Daily Stock Market Recap — Close & Open" },
      { property: "og:description", content: "Today's morning market report: the prior trading day's recap and what it means." },
    ],
  }),
  component: Today,
});

function Today() {
  const q = useQuery({
    queryKey: ["report", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").order("report_date", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data as Report | null;
    },
  });
  if (q.isLoading)
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="skel !h-10 w-3/4" />
        <span className="skel w-1/3" />
        <div className="group"><SkeletonRows rows={6} /></div>
      </div>
    );
  if (q.isError) return <div className="group"><ErrorRow message="the report couldn't be loaded" onRetry={() => q.refetch()} /></div>;
  if (!q.data)
    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <PageHeader title="Today" subtitle="Today's report publishes at 6:30am ET on weekdays." />
        <QuoteList label="Live markets" rows={TAPE} sortable={false} compact footer="Quotes may be delayed. Change vs prior close; yields in basis points." />
      </div>
    );
  return <ReportView report={q.data} />;
}
