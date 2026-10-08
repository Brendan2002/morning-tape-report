# Close & Open

A daily morning market report and market-data site: a recap of the prior US trading session, overnight Asia and Europe, rates, FX, commodities, an economic calendar, and an agriculture/dairy view.

**Live site:** https://closeandopen.com

> Information only — not investment advice. Figures can be delayed or wrong; every number on the site carries its source and as-of time.

## Pages

| Route | What it shows |
|---|---|
| `/` | Today's report: headline, summary, five key developments, market snapshot table, calendar, business lens |
| `/markets` | Live market widgets (TradingView embeds) |
| `/macro` | Treasury curve, SOFR/EFFR and other official rates, macro series |
| `/dairy` | USDA dairy product prices, FMMO class prices, feed, diesel, freight |
| `/calendar` | Economic releases and events for the coming week (ET) |
| `/archive`, `/report/:date` | Past reports |
| `/sources` | Data sources and terms |
| `/mcp` | Read-only MCP server for reports, calendar and data (OAuth required) |

Readers can flag a wrong number, broken link or typo from any page with the "Report an issue" form.

## Data sources

- **Quotes and charts:** TradingView embed widgets only (licensed for public display). No server-side quote feed.
- **Rates:** NY Fed Markets API (SOFR, EFFR), U.S. Treasury daily par yield curve.
- **Macro series:** FRED, fetched live server-side and never stored or cached (per FRED terms), limited to an allowlist of series.
- **Energy:** EIA (on-highway diesel).
- **Agriculture and dairy:** USDA AMS DataMart (dairy product sales, FMMO class prices), USDA AgTransport.
- **Daily report:** written each weekday morning from public sources, each cited inline. Values that can't be confirmed are shown as "Unavailable", never estimated or carried forward.

## Stack

TanStack Start (React, SSR) · Tailwind CSS · shadcn/ui · Supabase (Postgres with row-level security, auth) · built with [Lovable](https://lovable.dev).

- `reports` and `calendar_events` are public read-only; writes need the service role.
- Issue reports are insert-only through a rate-limited server function; nobody can read them from the client.
- The watchlist requires the `admin` role.

## Running locally

Requires Node.js 20+ (or Bun).

```sh
git clone https://github.com/Brendan2002/morning-tape-report.git
cd morning-tape-report
npm install
npm run dev
```

`.env` holds only the public Supabase URL and publishable key. Server features need these secrets in your own environment (never commit them):

| Variable | Used for |
|---|---|
| `FRED_API_KEY` | Macro series |
| `EIA_API_KEY` | Diesel prices |
| `USDA_MARS_API_KEY` | Optional: USDA MyMarketNews CME spot rows |
| `RESEND_API_KEY`, `LOVABLE_API_KEY` | Optional: issue-report email alerts |
| `ISSUE_NOTIFY_EMAIL` | Where issue alerts go; alerts are skipped if unset |

Other scripts: `npm run build`, `npm test`, `npm run lint`.

## Contributing

Found a data error? Use "Report an issue" on the site. Code issues and pull requests are welcome here.
