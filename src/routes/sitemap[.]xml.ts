import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import { resolveReportPaths } from "@/lib/sitemap-reports";
import { isSitemapRouteIncluded, sitemapPathForLocation, sitemapStaticPaths, sitemapXML, type SitemapEntry } from "@/lib/sitemap";

const BASE_URL = "https://closeandopen.com";
const PAGE_SIZE = 1000;

async function fetchReportDates(signal: AbortSignal): Promise<string[]> {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === "Bearer " + key) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
    const dates: string[] = [];
    for (let offset = 0; ; ) {
      const { data, error } = await supabase
        .from("reports")
        .select("report_date")
        .order("report_date", { ascending: false })
        .order("id")
        .range(offset, offset + PAGE_SIZE - 1)
        .abortSignal(signal);
      if (error) throw error;
      if (data.length === 0) break;
      for (const row of data) dates.push(row.report_date);
      if (data.length < PAGE_SIZE) break;
      offset += data.length;
    }
  return dates;
}

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

        const routeId = "/report/$date";
        if (isSitemapRouteIncluded(router.routesById[routeId])) {
          const { paths: reportPaths } = await resolveReportPaths(async (signal) => {
            const out: string[] = [];
            for (const date of await fetchReportDates(signal)) {
              const location = router.buildLocation({ to: "/report/$date", params: { date }, search: () => ({}), hash: "" });
              const path = sitemapPathForLocation(router, location, routeId);
              if (path) out.push(path);
            }
            return out;
          });
          if (!reportPaths) {
            // No complete list available: ask crawlers to retry rather than serve a partial sitemap.
            return new Response("Sitemap temporarily unavailable.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "300", "Cache-Control": "no-store" },
            });
          }
          for (const path of reportPaths) entries.push({ path });
        }

        if (entries.length === 0) {
          return new Response("No pages are included in this sitemap.", { status: 404, headers: { "Cache-Control": "no-store" } });
        }
        return new Response(sitemapXML(BASE_URL, entries), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400",
          },
        });
      },
    },
  },
});
