import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Public reads (reports, calendar) for SSR — anon key, RLS applies.
function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getLatestReport = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient().from("reports").select("*").order("report_date", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Report unavailable");
  return data;
});

export const getReportByDate = createServerFn({ method: "GET" })
  .inputValidator((d: { date: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) throw new Error("Invalid date");
    return d;
  })
  .handler(async ({ data }) => {
    const { data: r, error } = await publicClient().from("reports").select("*").eq("report_date", data.date).maybeSingle();
    if (error) throw new Error("Report unavailable");
    return r;
  });

export const listReports = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient().from("reports").select("id, report_date, headline, summary, body_md").order("report_date", { ascending: false });
  if (error) throw new Error("Reports unavailable");
  return data ?? [];
});

export const getCalendarWeek = createServerFn({ method: "GET" }).handler(async () => {
  const etToday = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const end = new Date(Date.parse(etToday + "T12:00:00Z") + 7 * 864e5).toISOString().slice(0, 10);
  const { data, error } = await publicClient()
    .from("calendar_events").select("*")
    .gte("event_date", etToday).lte("event_date", end)
    .order("event_date").order("event_time");
  if (error) throw new Error("Calendar unavailable");
  return data ?? [];
});
