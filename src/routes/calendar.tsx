import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/components/report";
import { ErrorLine, SectionLabel, Skeleton } from "@/components/tape";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Economic Calendar — Morning Tape" },
      { name: "description", content: "Economic releases and central bank events for the next 7 days." },
      { property: "og:title", content: "Economic Calendar — Morning Tape" },
      { property: "og:description", content: "Economic releases and central bank events for the next 7 days." },
    ],
  }),
  component: CalendarPage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function CalendarPage() {
  const q = useQuery({
    queryKey: ["calendar"],
    queryFn: async () => {
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 864e5);
      const { data, error } = await supabase
        .from("calendar_events").select("*")
        .gte("event_date", iso(now)).lte("event_date", iso(end))
        .order("event_date").order("event_time");
      if (error) throw error;
      return data;
    },
  });
  if (q.isLoading) return <Skeleton rows={6} />;
  if (q.isError) return <ErrorLine message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  const days = new Map<string, typeof q.data>();
  q.data!.forEach((e) => days.set(e.event_date, [...(days.get(e.event_date) ?? []), e]));
  if (days.size === 0) return <p className="py-6 text-muted-foreground">No scheduled events in the next 7 days.</p>;
  return (
    <div className="space-y-8">
      {[...days].map(([day, evs]) => (
        <section key={day}>
          <SectionLabel>{longDate(day)}</SectionLabel>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Time ET</th><th>Region</th><th>Event</th><th>Imp.</th><th className="r">Prior</th><th className="r">Forecast</th><th className="r">Actual</th></tr></thead>
              <tbody>
                {evs!.map((e) => (
                  <tr key={e.id}>
                    <td className="num">{e.event_time ?? "—"}</td>
                    <td>{e.region ?? "—"}</td>
                    <td className="font-medium">{e.title}</td>
                    <td className="num" aria-label={`Importance ${e.importance} of 3`}>{"●".repeat(e.importance)}{"○".repeat(Math.max(0, 3 - e.importance))}</td>
                    <td className="r num">{e.prior ?? "—"}</td>
                    <td className="r num">{e.forecast ?? "—"}</td>
                    <td className="r num">{e.actual ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
