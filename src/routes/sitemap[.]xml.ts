import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import { isSitemapRouteIncluded, sitemapPathForLocation, sitemapStaticPaths, sitemapXML, type SitemapEntry } from "@/lib/sitemap";

const BASE_URL = "https://closeandopen.com";
const QUERY_TIMEOUT_MS = 4000;
const PAGE_SIZE = 1000;

// Last fully successful list of report paths (per worker isolate). Used only when a fresh
// query fails or times out, so crawlers never receive a sitemap missing real reports.
let lastGoodReportPaths: string[] | null = null;

async function fetchReportDates(): Promise<string[]> {
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
  try {
    const dates: string[] = [];
    for (let offset = 0; ; ) {
      const { data, error } = await supabase
        .from("reports")
        .select("report_date")
        .order("report_date", { ascending: false })
        .order("id")
        .range(offset, offset + PAGE_SIZE - 1)
        .abortSignal(controller.signal);
      if (error) throw error;
      if (data.length === 0) break;
      for (const row of data) dates.push(row.report_date);
      if (data.length < PAGE_SIZE) break;
      offset += data.length;
    }
    return dates;
  } finally {
    clearTimeout(timer);
  }
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
          let reportPaths: string[] | null = null;
          try {
            const dates = await fetchReportDates();
            reportPaths = [];
            for (const date of dates) {
              const location = router.buildLocation({ to: "/report/$date", params: { date }, search: () => ({}), hash: "" });
              const path = sitemapPathForLocation(router, location, routeId);
              if (path) reportPaths.push(path);
            }
            lastGoodReportPaths = reportPaths;
          } catch (error) {
            console.error("sitemap: reports query failed", error);
            reportPaths = lastGoodReportPaths;
          }
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
