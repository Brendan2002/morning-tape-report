import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getCalendarWeek } from "@/lib/reports.functions";
import { longDate } from "@/components/report";
import { ErrorRow, Group, PageHeader, SourceTag } from "@/components/tape";
import { FlagButton } from "@/components/report-issue";

export const Route = createFileRoute("/calendar")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Economic Calendar — Close & Open" },
      { name: "description", content: "Economic releases and central bank events for the next 7 days." },
      { property: "og:title", content: "Economic Calendar — Close & Open" },
      { property: "og:description", content: "Economic releases and central bank events for the next 7 days." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://closeandopen.com/calendar" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://closeandopen.com/calendar" }],
  }),
  loader: () => getCalendarWeek(),
  errorComponent: CalendarError,
  component: CalendarPage,
});


function CalendarPage() {
  const events = Route.useLoaderData();
  const days = new Map<string, typeof events>();
  events.forEach((e) => days.set(e.event_date, [...(days.get(e.event_date) ?? []), e]));
  return (
    <>
      <PageHeader title="Calendar" subtitle="Next 7 days · times in ET · importance ●●● high to ●○○ low" />
      {days.size === 0 ? (
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
                    <SourceTag>Close & Open calendar · updated {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</SourceTag>
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

function CalendarError() {
  const router = useRouter();
  return <><PageHeader title="Calendar" /><div className="group"><ErrorRow onRetry={() => router.invalidate()} /></div></>;
}
