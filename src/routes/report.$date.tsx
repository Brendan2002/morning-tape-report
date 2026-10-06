import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportView, type Report } from "@/components/report";
import { ErrorRow, PageHeader, SkeletonRows } from "@/components/tape";

const SITE = "https://morning-tape-report.lovable.app";

const reportQuery = (date: string) =>
  queryOptions({
    queryKey: ["report", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").eq("report_date", date).maybeSingle();
      if (error) throw error;
      return data as Report | null;
    },
  });

export const Route = createFileRoute("/report/$date")({
  staticData: { sitemap: true },
  loader: async ({ params, context }) => {
    try {
      return await context.queryClient.ensureQueryData(reportQuery(params.date));
    } catch {
      return null; // component shows its own error state with retry
    }
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE}/report/${params.date}`;
    const title = loaderData ? `${loaderData.headline} — Morning Tape` : `Report for ${params.date} — Morning Tape`;
    const description = loaderData?.summary || `Morning Tape market report for ${params.date}.`;
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
              author: { "@type": "Organization", name: "Morning Tape", url: SITE },
              publisher: { "@type": "Organization", name: "Morning Tape", url: SITE },
            }),
          }]
        : [],
    };
  },
  errorComponent: () => <div className="group"><ErrorRow message="the report couldn't be loaded" onRetry={() => location.reload()} /></div>,
  notFoundComponent: () => <PageHeader title="No report" subtitle="That report doesn't exist." />,
  component: ReportPage,
});

function ReportPage() {
  const { date } = Route.useParams();
  const q = useQuery(reportQuery(date));
  if (q.isLoading) return <div className="group"><SkeletonRows rows={6} /></div>;
  if (q.isError) return <div className="group"><ErrorRow message="the report couldn't be loaded" onRetry={() => q.refetch()} /></div>;
  if (!q.data) return <><PageHeader title="No report" subtitle={`There's no report for ${date}.`} /><Link to="/archive" className="btn-text">Browse the archive</Link></>;
  return <ReportView report={q.data} />;
}
