import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getLatestReport } from "@/lib/reports.functions";
import { ReportView, TAPE, type Report } from "@/components/report";
import { ErrorRow, PageHeader, QuoteList } from "@/components/tape";

const TITLE = "Daily Markets, Economy & Agriculture Brief — Close & Open";
const DESC = "Every morning: a recap of stocks, Treasury yields and rates, key macro data, and dairy, feed and fuel prices, with sources and as-of times.";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  loader: () => getLatestReport(),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://closeandopen.com/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://closeandopen.com/" }],
  }),
  errorComponent: TodayError,
  component: Today,
});

function TodayError() {
  const router = useRouter();
  return <div className="group"><ErrorRow message="the report couldn't be loaded" onRetry={() => router.invalidate()} /></div>;
}

function Today() {
  const report = Route.useLoaderData() as Report | null;
  if (!report)
    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <PageHeader title="Today" subtitle="Today's report publishes at 6:30am ET on weekdays." />
        <QuoteList label="Live markets" rows={TAPE} sortable={false} compact footer="Quotes may be delayed. Change vs prior close; yields in basis points." />
      </div>
    );
  return <ReportView report={report} />;
}
