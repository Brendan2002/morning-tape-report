// Complete-or-nothing report list for the sitemap: a fresh full list, else the last
// complete list, else null (caller answers 503). Never returns a partial list.
export const REPORT_QUERY_TIMEOUT_MS = 4000;

let lastGood: string[] | null = null;

export function resetReportPathCache() {
  lastGood = null;
}

export async function resolveReportPaths(
  load: (signal: AbortSignal) => Promise<string[]>,
  timeoutMs = REPORT_QUERY_TIMEOUT_MS,
): Promise<{ paths: string[] | null; source: "fresh" | "cache" | "none" }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("reports query timed out"));
    }, timeoutMs);
  });
  try {
    const paths = await Promise.race([load(controller.signal), timeout]);
    lastGood = paths;
    return { paths, source: "fresh" };
  } catch (error) {
    console.error("sitemap: reports query failed", error);
    return lastGood ? { paths: lastGood, source: "cache" } : { paths: null, source: "none" };
  } finally {
    clearTimeout(timer);
  }
}
