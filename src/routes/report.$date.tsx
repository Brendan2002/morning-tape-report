import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getReportByDate } from "@/lib/reports.functions";
import { ReportView, type Report } from "@/components/report";
import { ErrorRow, PageHeader } from "@/components/tape";

const SITE = "https://closeandopen.com";

export const Route = createFileRoute("/report/$date")({
  staticData: { sitemap: true },
  loader: ({ params }) => getReportByDate({ data: { date: params.date } }),
  head: ({ params, loaderData }) => {
    const url = `${SITE}/report/${params.date}`;
    const title = loaderData ? `${loaderData.headline} — Close & Open` : `Report for ${params.date} — Close & Open`;
    const description = loaderData?.summary || `Close & Open market report for ${params.date}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(loaderData ? [{ property: "article:published_time", content: loaderData.created_at }] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: loaderData
        ? [{
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: loaderData.headline.slice(0, 110),
              description: loaderData.summary,
              datePublished: loaderData.created_at,
              dateModified: loaderData.created_at,
              mainEntityOfPage: url,
              author: { "@type": "Organization", name: "Close & Open", url: SITE },
              publisher: { "@type": "Organization", name: "Close & Open", url: SITE },
            }),
          }]
        : [],
    };
  },
  errorComponent: ReportError,
  notFoundComponent: () => <PageHeader title="No report" subtitle="That report doesn't exist." />,
  component: ReportPage,
});

function ReportError() {
  const router = useRouter();
  return <div className="group"><ErrorRow message="the report couldn't be loaded" onRetry={() => router.invalidate()} /></div>;
}

function ReportPage() {
  const { date } = Route.useParams();
  const report = Route.useLoaderData() as Report | null;
  if (!report) return <><PageHeader title="No report" subtitle={`There's no report for ${date}.`} /><Link to="/archive" className="btn-text">Browse the archive</Link></>;
  return <ReportView report={report} />;
}
