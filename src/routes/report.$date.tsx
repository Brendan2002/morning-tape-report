import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportView, type Report } from "@/components/report";
import { ErrorRow, PageHeader, SkeletonRows } from "@/components/tape";

export const Route = createFileRoute("/report/$date")({
  head: ({ params }) => ({
    meta: [
      { title: `Report for ${params.date} — Morning Tape` },
      { name: "description", content: `Morning Tape market report for ${params.date}.` },
      { property: "og:title", content: `Report for ${params.date} — Morning Tape` },
      { property: "og:description", content: `Morning Tape market report for ${params.date}.` },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { date } = Route.useParams();
  const q = useQuery({
    queryKey: ["report", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").eq("report_date", date).maybeSingle();
      if (error) throw error;
      return data as Report | null;
    },
  });
  if (q.isLoading) return <div className="group"><SkeletonRows rows={6} /></div>;
  if (q.isError) return <div className="group"><ErrorRow message="the report couldn't be loaded" onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <><PageHeader title="No report" subtitle={`There's no report for ${date}.`} /><Link to="/archive" className="btn-text">Browse the archive</Link></>;
  return <ReportView report={q.data} />;
}
