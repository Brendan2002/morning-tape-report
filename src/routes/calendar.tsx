import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/components/report";
import { ErrorRow, Group, PageHeader, SkeletonRows, SourceTag } from "@/components/tape";
import { FlagButton } from "@/components/report-issue";

export const Route = createFileRoute("/calendar")({
  staticData: { sitemap: true },
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
  const days = new Map<string, NonNullable<typeof q.data>>();
  (q.data ?? []).forEach((e) => days.set(e.event_date, [...(days.get(e.event_date) ?? []), e]));
  return (
    <>
      <PageHeader title="Calendar" subtitle="Next 7 days · times in ET · importance ●●● high to ●○○ low" />
      {q.isLoading ? <div className="group"><SkeletonRows rows={5} /></div> : q.isError ? <div className="group"><ErrorRow onRetry={() => q.refetch()} /></div> : days.size === 0 ? (
        <div className="group"><div className="row text-muted-foreground">No scheduled events in the next 7 days.</div></div>
      ) : (
        <div className="space-y-8">
          {[...days].map(([day, evs]) => (
            <Group key={day} label={longDate(day)}>
              {evs.map((e) => (
                <div className="row !items-start !pr-2" key={e.id}>
                  <div className="w-[64px] shrink-0 pt-0.5 text-[15px]">
                    <div>{e.event_time ?? "TBA"}</div>
                    <div className="text-[13px] text-muted-foreground">{e.region ?? ""}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{e.title}</div>
                    <div className="text-[13px] text-link" aria-label={`Importance ${e.importance} of 3`}>
                      {"●".repeat(Math.min(3, e.importance))}{"○".repeat(Math.max(0, 3 - e.importance))}
                    </div>
                    <dl className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
                      {([["Prior", e.prior], ["Forecast", e.forecast], ["Actual", e.actual]] as const).map(([k, v]) => (
                        <div key={k} className="flex gap-1"><dt className="text-muted-foreground">{k}</dt><dd>{v ?? "—"}</dd></div>
                      ))}
                    </dl>
                    <SourceTag>Morning Tape calendar · updated {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</SourceTag>
                  </div>
                  <FlagButton ctx={{ field: `Calendar: ${e.title}`, displayedValue: `Prior ${e.prior ?? "—"} / Fcst ${e.forecast ?? "—"} / Actual ${e.actual ?? "—"}` }} />
                </div>
              ))}
            </Group>
          ))}
        </div>
      )}
    </>
  );
}
