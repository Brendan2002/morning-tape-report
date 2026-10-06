import { auth, defineMcp } from "@lovable.dev/mcp-js";
import { getLatestReport, getReport, searchReports } from "./tools/reports";
import { getCalendar, getEconomicData, getQuotes } from "./tools/data";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "morning-market-brief",
  title: "Morning Market Brief",
  version: "0.1.0",
  instructions:
    "Market data from Close & Open. Use get_latest_report for today's morning market recap, get_report or search_reports for the archive, get_economic_calendar for upcoming releases, get_quotes for delayed Yahoo Finance quotes, and get_economic_data for FRED series. Always cite the as-of time and source; values marked Unavailable could not be fetched. Not investment advice.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getLatestReport, getReport, searchReports, getCalendar, getQuotes, getEconomicData],
});
