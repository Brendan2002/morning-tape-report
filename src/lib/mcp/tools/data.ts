import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";
import { fetchQuote } from "@/lib/market.functions";
import { fetchFredSeries } from "@/lib/macro.functions";

export const getCalendar = defineTool({
  name: "get_economic_calendar",
  title: "Get economic calendar",
  description: "List scheduled economic releases and central bank events for the next N days (times in ET).",
  inputSchema: { days: z.number().int().min(1).max(30).default(7).describe("How many days ahead (1–30).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }) => {
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
    const { data, error } = await supabaseAnon()
      .from("calendar_events").select("event_date, event_time, region, title, importance, prior, forecast, actual")
      .gte("event_date", today).lte("event_date", end).order("event_date").order("event_time");
    if (error) throw new ToolError(`Could not load the calendar: ${error.message}`);
    const events = (data ?? []).map((e) => ({ ...e }));
    const text = events.length
      ? events.map((e) => `${e.event_date} ${e.event_time ?? "TBA"} ET [${e.region ?? "—"}] ${e.title} (importance ${e.importance}/3) prior ${e.prior ?? "—"}, forecast ${e.forecast ?? "—"}, actual ${e.actual ?? "—"}`).join("\n")
      : `No scheduled events in the next ${days} days.`;
    return { content: [{ type: "text", text }], structuredContent: { events } };
  },
});

export const getQuotes = defineTool({
  name: "get_quotes",
  title: "Get market quotes",
  description: "Get delayed quotes (last, change vs prior close, % change, as-of time) for Yahoo Finance symbols such as ^GSPC, AAPL, ES=F, EURUSD=X.",
  inputSchema: { symbols: z.array(z.string().trim().min(1).max(20)).min(1).max(25).describe("Yahoo Finance symbols.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ symbols }, ctx) => {
    const quotes = await Promise.all(symbols.map((s) => fetchQuote(s.toUpperCase())));
    if (ctx.signal.aborted) throw new ToolError("Cancelled");
    const rows = quotes.map((q) => ({
      symbol: q.symbol,
      name: q.name,
      available: !q.error && q.last != null,
      last: q.error ? null : q.last,
      change_vs_prior_close: q.error ? null : q.change,
      change_pct: q.error ? null : q.changePct,
      as_of: q.marketTime ? new Date(q.marketTime * 1000).toISOString() : null,
      source: "Yahoo Finance (unofficial, may be delayed)",
    }));
    const text = rows
      .map((r) => r.available
        ? `${r.symbol}${r.name ? ` (${r.name})` : ""}: ${r.last?.toFixed(2)} ${r.change_pct != null ? `${r.change_pct >= 0 ? "+" : ""}${r.change_pct.toFixed(2)}%` : ""} vs prior close · as of ${r.as_of} · Yahoo Finance`
        : `${r.symbol}: Unavailable`)
      .join("\n");
    return { content: [{ type: "text", text }], structuredContent: { quotes: rows } };
  },
});

const SERIES = {
  DGS1MO: "1-month Treasury yield (%)", DGS3MO: "3-month Treasury yield (%)", DGS6MO: "6-month Treasury yield (%)",
  DGS1: "1-year Treasury yield (%)", DGS2: "2-year Treasury yield (%)", DGS5: "5-year Treasury yield (%)",
  DGS10: "10-year Treasury yield (%)", DGS30: "30-year Treasury yield (%)",
  SOFR: "Secured Overnight Financing Rate (%)", EFFR: "Effective federal funds rate (%)", DFF: "Fed funds effective, daily (%)",
  UNRATE: "Unemployment rate (%)", CPIAUCSL: "CPI, all items (index)", CPILFESL: "Core CPI (index)",
  PAYEMS: "Nonfarm payrolls (thousands)", MORTGAGE30US: "30-year mortgage rate (%)", GASDESW: "US on-highway diesel ($/gal)",
} as const;
type SeriesId = keyof typeof SERIES;

export const getEconomicData = defineTool({
  name: "get_economic_data",
  title: "Get economic data (FRED)",
  description: "Latest and prior observations from FRED for Treasury yields, SOFR, EFFR, unemployment, CPI, payrolls, mortgage rates and diesel. LIBOR is not available (discontinued).",
  inputSchema: {
    series: z.array(z.enum(Object.keys(SERIES) as [SeriesId, ...SeriesId[]])).min(1).max(17).describe("FRED series IDs."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ series }) => {
    let data;
    try { data = await fetchFredSeries(series); } catch { throw new ToolError("Economic data is unavailable right now."); }
    const rows = data.map((s) => {
      const last = s.points.at(-1), prior = s.points.at(-2);
      return {
        id: s.id,
        description: SERIES[s.id as SeriesId],
        available: !!last,
        latest: last ? { date: last.date, value: last.value } : null,
        prior: prior ? { date: prior.date, value: prior.value } : null,
        source: "FRED, Federal Reserve Bank of St. Louis",
      };
    });
    const text = rows.map((r) => r.latest ? `${r.id} — ${r.description}: ${r.latest.value} on ${r.latest.date}${r.prior ? ` (prior ${r.prior.value} on ${r.prior.date})` : ""} · FRED` : `${r.id}: Unavailable`).join("\n");
    return { content: [{ type: "text", text }], structuredContent: { series: rows } };
  },
});
