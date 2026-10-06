import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/components/report";
import { ErrorLine, SectionLabel, Skeleton } from "@/components/tape";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archive — Morning Tape" },
      { name: "description", content: "Every past Morning Tape market report, by date." },
      { property: "og:title", content: "Archive — Morning Tape" },
      { property: "og:description", content: "Every past Morning Tape market report, by date." },
    ],
  }),
  component: Archive,
});

function Archive() {
  const q = useQuery({
    queryKey: ["reports", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("id, report_date, headline, summary").order("report_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="max-w-[68ch]">
      <SectionLabel>Archive</SectionLabel>
      {q.isLoading ? <Skeleton rows={6} /> : q.isError ? <ErrorLine message={(q.error as Error).message} onRetry={() => q.refetch()} /> : q.data!.length === 0 ? (
        <p className="py-6 text-muted-foreground">No reports yet.</p>
      ) : (
        <ol>
          {q.data!.map((r) => (
            <li key={r.id} className="border-b border-rule py-4">
              <p className="num text-xs text-muted-foreground">{longDate(r.report_date)}</p>
              <Link to="/report/$date" params={{ date: r.report_date }} className="mt-1 block font-serif text-[20px] font-semibold leading-snug text-foreground hover:text-link">
                {r.headline}
              </Link>
              <p className="mt-1 text-muted-foreground">{r.summary}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
