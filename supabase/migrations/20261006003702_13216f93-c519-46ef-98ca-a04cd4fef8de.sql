CREATE TABLE public.reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), report_date date UNIQUE NOT NULL, headline text NOT NULL, summary text NOT NULL DEFAULT '', body_md text NOT NULL DEFAULT '', sources jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.reports TO anon, authenticated; GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read reports" ON public.reports FOR SELECT USING (true);

CREATE TABLE public.calendar_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_date date NOT NULL, event_time text, region text, title text NOT NULL, importance int NOT NULL DEFAULT 1, prior text, forecast text, actual text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.calendar_events TO anon, authenticated; GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read events" ON public.calendar_events FOR SELECT USING (true);

CREATE TABLE public.watchlist (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), symbol text UNIQUE NOT NULL CHECK (char_length(symbol) BETWEEN 1 AND 15), note text, added_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, DELETE ON public.watchlist TO anon, authenticated; GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read wl" ON public.watchlist FOR SELECT USING (true);
CREATE POLICY "public insert wl" ON public.watchlist FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete wl" ON public.watchlist FOR DELETE USING (true);

INSERT INTO public.watchlist (symbol) VALUES ('SPY'),('QQQ'),('AAPL'),('NVDA'),('MSFT');

INSERT INTO public.calendar_events (event_date, event_time, region, title, importance, prior, forecast, actual) VALUES
(current_date + 1, '08:30', 'US', 'Initial Jobless Claims', 2, '218K', '220K', NULL),
(current_date + 2, '08:30', 'US', 'Nonfarm Payrolls', 3, '142K', '165K', NULL),
(current_date + 3, '04:00', 'EZ', 'ECB Monetary Policy Statement', 3, '3.40%', '3.40%', NULL);

INSERT INTO public.reports (report_date, headline, summary, body_md, sources) VALUES
(current_date - 1, 'Sample report: Stocks edge higher as yields ease ahead of payrolls',
'Sample report. US equities closed modestly higher as Treasury yields slipped and the dollar softened. Investors positioned cautiously ahead of Friday''s jobs report.',
'## What happened
This is a **sample report** to preview the layout. The S&P 500 rose 0.4%, led by technology and communication services, while small caps lagged.

## Americas
The Nasdaq Composite added 0.6%. The Dow finished flat as industrials offset gains in software. Canadian stocks tracked energy lower.

## Europe
The Stoxx 50 gained 0.3%. Germany''s DAX outperformed on autos; London''s FTSE 100 was little changed.

## Asia
Japan''s Nikkei slipped 0.2% as the yen firmed. Hong Kong rallied 1.1% on property-sector support measures.

## Rates & FX
The 10-year Treasury yield fell 4 basis points to 4.12%. The dollar index eased 0.2%; EUR/USD rose to 1.09.

## Commodities
WTI crude fell 1.3% on inventory builds. Gold rose 0.5% to a fresh record. Bitcoin traded in a narrow range.

## What to watch today
- Weekly jobless claims at 8:30am ET
- Fed speakers through the afternoon
- Earnings after the close',
'[{"title":"CNBC — US Markets","url":"https://www.cnbc.com/us-markets/"},{"title":"Reuters — Markets","url":"https://www.reuters.com/markets/"},{"title":"Bloomberg — Markets","url":"https://www.bloomberg.com/markets"}]'::jsonb);