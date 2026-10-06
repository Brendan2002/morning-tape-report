import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportView, type Report } from "@/components/report";
import { ErrorLine, Skeleton } from "@/components/tape";

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
  if (q.isLoading) return <Skeleton rows={8} />;
  if (q.isError) return <ErrorLine message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  if (!q.data) return <p className="py-12 text-muted-foreground">No report for {date}. <Link to="/archive">See the archive</Link>.</p>;
  return <ReportView report={q.data} />;
}
