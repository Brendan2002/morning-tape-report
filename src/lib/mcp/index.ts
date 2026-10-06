import { defineMcp } from "@lovable.dev/mcp-js";
import { getLatestReport, getReport, searchReports } from "./tools/reports";
import { getCalendar, getEconomicData, getQuotes } from "./tools/data";

export default defineMcp({
  name: "morning-market-brief",
  title: "Morning Market Brief",
  version: "0.1.0",
  instructions:
    "Public market data from Morning Tape. Use get_latest_report for today's morning market recap, get_report or search_reports for the archive, get_economic_calendar for upcoming releases, get_quotes for delayed Yahoo Finance quotes, and get_economic_data for FRED series. Always cite the as-of time and source; values marked Unavailable could not be fetched. Not investment advice.",
  tools: [getLatestReport, getReport, searchReports, getCalendar, getQuotes, getEconomicData],
});
