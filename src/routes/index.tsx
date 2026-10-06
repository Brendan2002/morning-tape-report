import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportView, TAPE, type Report } from "@/components/report";
import { ErrorLine, QuoteTable, SectionLabel, Skeleton } from "@/components/tape";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Morning Tape" },
      { name: "description", content: "Today's morning market report: yesterday's recap and what it means." },
      { property: "og:title", content: "Today — Morning Tape" },
      { property: "og:description", content: "Today's morning market report: yesterday's recap and what it means." },
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
  if (q.isLoading) return <Skeleton rows={8} />;
  if (q.isError) return <ErrorLine message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  if (!q.data)
    return (
      <div className="grid gap-8 md:grid-cols-[65fr_35fr]">
        <p className="py-12 font-serif text-[20px] italic text-muted-foreground">Today's report publishes at 6:30am ET on weekdays.</p>
        <aside><SectionLabel>The Tape</SectionLabel><QuoteTable rows={TAPE} /></aside>
      </div>
    );
  return <ReportView report={q.data} />;
}
