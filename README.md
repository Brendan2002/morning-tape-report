# Morning Market Brief

Build "Close & Open" — a personal finance-overview site whose centerpiece is a daily morning market report (recap of the prior trading day + what it means), plus a market dashboard, macro/rates section, economic calendar, report archive and a personal watchlist. Enable Lovable Cloud (database + edge functions).

## Design system (follow strictly — newspaper/broadsheet feel, NOT a SaaS dashboard)
- Palette: paper background #F7F5F0, ink #141414, secondary text #5C5A55, hairline rules #DAD6CC, one accent #1F3A5F (navy) for links/active nav. Up = #1E7B4A, down = #B3261E — used ONLY for price changes, nowhere else. Provide a dark mode: background #121212, ink #EDEAE3, rules #2C2C2A, accent #8FB3E0, up #4CC38A, down #F2726B.
- Type: headlines in "Newsreader" or "Source Serif 4" (Google Fonts) serif; body/UI in "Inter"; ALL numbers in "JetBrains Mono" with tabular figures. Scale: 12 / 14 / 16 / 20 / 28 / 40px. Report body 17px, line-height 1.6, max width ~68ch.
- Spacing: 4px base (4, 8, 12, 16, 24, 32, 48). Border radius 2px max (essentially square). No shadows, no gradients, no card grids, no centered hero, no decorative icons/illustrations. Separate sections with 1px hairline rules and small-caps section labels (letter-spacing 0.08em, 12px).
- Data in dense tables, not tiles: columns Name | Last | Chg | Chg% (right-aligned mono), 32px rows, hover row highlight, sortable headers.
- Layout: top masthead = site name in serif + date + small "as of HH:MM ET" stamp; horizontal text nav below a double rule (Today · Markets · Macro & Rates · Calendar · Archive · Watchlist). Desktop: Today page is 2 columns — report (left, ~65%) and a "Tape" rail of key numbers (right). Under 768px collapse to one column, rail moves below headline. Must work at 320px with no horizontal page scroll (tables scroll inside their own container).

## Pages
1. **Today** (/) — latest row from `reports`: big serif headline, dateline, 2–3 sentence summary in italic deck, then markdown body (sections like "What happened", "Americas", "Europe", "Asia", "Rates & FX", "Commodities", "What to watch today"). Below: "Sources" list of links. Right rail "The Tape": S&P 500, Nasdaq, Dow, Russell 2000, ES/NQ futures, 10Y yield, DXY, EUR/USD, WTI, Gold, Bitcoin — live from the market-data function. If no report exists yet show a quiet empty state "Today's report publishes at 6:30am ET on weekdays."
2. **Markets** — tables grouped with section labels: Americas (^GSPC, ^IXIC, ^DJI, ^RUT, ^GSPTSE, ^BVSP), Europe (^STOXX50E, ^FTSE, ^GDAXI, ^FCHI), Asia (^N225, ^HSI, 000001.SS, ^KS11, ^AXJO), Index futures (ES=F, NQ=F, YM=F, RTY=F), Currencies (DX-Y.NYB, EURUSD=X, USDJPY=X, GBPUSD=X, USDCNY=X, USDCAD=X, BTC-USD), Commodities (CL=F, BZ=F, NG=F, GC=F, SI=F, HG=F, ZC=F, ZW=F). Each table footer links to the matching outside source page (CNBC Americas/Europe/Asia/futures, Bloomberg futures/currencies, WSJ commodities).
3. **Macro & Rates** — US Treasury curve table + small line chart (1M, 3M, 2Y, 5Y, 10Y, 30Y from FRED: DGS1MO, DGS3MO, DGS2, DGS5, DGS10, DGS30), SOFR (FRED: SOFR — note "LIBOR was discontinued in 2023; SOFR is its replacement"), Fed funds effective (DFF), 2s10s spread, Unemployment rate (UNRATE), CPI YoY (computed from CPIAUCSL), each with last value, prior value, date, and a 2-year sparkline. Links to Reuters rates-bonds, Bloomberg US govt bonds, Bloomberg USURTOT.
4. **Calendar** — table from `calendar_events` for next 7 days grouped by day: time ET, region, event, importance (1–3 shown as ●●○), prior, forecast, actual.
5. **Archive** — list of past reports by date (headline + summary), click to /report/:date showing the same layout as Today.
6. **Watchlist** — table of symbols from `watchlist` with live quote (via market-data), add symbol input (uppercase, validate non-empty, max 15 chars, reject duplicates, show inline error), remove button. Seed with SPY, QQQ, AAPL, NVDA, MSFT.

## Data
- Tables: `reports` (id uuid pk, report_date date unique, headline text, summary text, body_md text, sources jsonb default '[]', created_at timestamptz default now()); `calendar_events` (id uuid pk, event_date date, event_time text, region text, title text, importance int, prior text, forecast text, actual text, created_at); `watchlist` (id uuid pk, symbol text unique, note text, added_at timestamptz default now()). RLS: public SELECT on all three; public INSERT/DELETE on watchlist only; reports and calendar_events writable only by service role.
- Edge function `macro-data`: fetches FRED series observations (https://api.stlouisfed.org/fred/series/observations) using secret FRED_API_KEY; cache 6 hours. Ask me for FRED_API_KEY via the secure secrets form.
- Every page needs loading skeletons (thin grey bars, no spinners) and a visible error line if a fetch fails, with a retry link.

Seed one sample report row dated yesterday clearly marked "Sample report" so the layout can be reviewed, and 3 sample calendar events.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://closeandopen.com

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d4ecdf40-95d2-4612-9be9-8bcc1154da12).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
