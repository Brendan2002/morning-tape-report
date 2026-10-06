import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

type ReportRow = { report_date: string; headline: string; summary: string; body_md: string; sources: unknown; created_at: string };

const toSources = (s: unknown) =>
  Array.isArray(s)
    ? s.filter((x): x is { title: string; url: string } => !!x && typeof x.title === "string" && typeof x.url === "string").map(({ title, url }) => ({ title, url }))
    : [];

const toReportJson = (r: ReportRow) => ({
  report_date: r.report_date,
  headline: r.headline,
  summary: r.summary,
  body_markdown: r.body_md,
  sources: toSources(r.sources),
  published_at: r.created_at,
  url: `https://morning-tape-report.lovable.app/report/${r.report_date}`,
});

const render = (r: ReturnType<typeof toReportJson>) =>
  `# ${r.headline}\n${r.report_date} · published ${r.published_at}\n\n${r.summary}\n\n${r.body_markdown}\n\nSources:\n${r.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n") || "- none listed"}\n\n${r.url}`;

export const getLatestReport = defineTool({
  name: "get_latest_report",
  title: "Get latest morning report",
  description: "Return the most recent Morning Tape daily market report (headline, summary, full text and sources).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const { data, error } = await supabaseAnon()
      .from("reports").select("report_date, headline, summary, body_md, sources, created_at")
      .order("report_date", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new ToolError(`Could not load the report: ${error.message}`);
    if (!data) return { content: [{ type: "text", text: "No report has been published yet. Reports publish at 6:30am ET on weekdays." }] };
    const r = toReportJson(data);
    return { content: [{ type: "text", text: render(r) }], structuredContent: { report: r } };
  },
});

export const getReport = defineTool({
  name: "get_report",
  title: "Get report by date",
  description: "Return the Morning Tape market report for a specific date (YYYY-MM-DD).",
  inputSchema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Report date, YYYY-MM-DD.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }) => {
    const { data, error } = await supabaseAnon()
      .from("reports").select("report_date, headline, summary, body_md, sources, created_at")
      .eq("report_date", date).maybeSingle();
    if (error) throw new ToolError(`Could not load the report: ${error.message}`);
    if (!data) throw new ToolError(`No report exists for ${date}.`);
    const r = toReportJson(data);
    return { content: [{ type: "text", text: render(r) }], structuredContent: { report: r } };
  },
});

export const searchReports = defineTool({
  name: "search_reports",
  title: "Search report archive",
  description: "List past Morning Tape reports, newest first, optionally filtered by keyword and/or month.",
  inputSchema: {
    query: z.string().trim().max(100).optional().describe("Keyword to match in headline, summary or text."),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional().describe("Month filter, YYYY-MM."),
    limit: z.number().int().min(1).max(50).default(10).describe("Maximum results (1–50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, month, limit }) => {
    let q = supabaseAnon().from("reports").select("report_date, headline, summary, body_md").order("report_date", { ascending: false });
    if (month) {
      const [y, m] = month.split("-").map(Number) as [number, number];
      const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      q = q.gte("report_date", `${month}-01`).lte("report_date", end);
    }
    const { data, error } = await q.limit(500);
    if (error) throw new ToolError(`Could not search reports: ${error.message}`);
    const t = query?.toLowerCase();
    const rows = (data ?? [])
      .filter((r) => !t || `${r.headline}\n${r.summary}\n${r.body_md}`.toLowerCase().includes(t))
      .slice(0, limit)
      .map((r) => ({ report_date: r.report_date, headline: r.headline, summary: r.summary }));
    const text = rows.length ? rows.map((r) => `${r.report_date} — ${r.headline}\n  ${r.summary}`).join("\n") : "No reports match.";
    return { content: [{ type: "text", text }], structuredContent: { reports: rows } };
  },
});
