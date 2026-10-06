DROP POLICY "public read reports" ON public.reports;
CREATE POLICY "public read published reports" ON public.reports FOR SELECT TO anon, authenticated USING (report_date <= (now() AT TIME ZONE 'America/New_York')::date);
DROP POLICY "public read events" ON public.calendar_events;
CREATE POLICY "public read recent and upcoming events" ON public.calendar_events FOR SELECT TO anon, authenticated USING (event_date >= ((now() AT TIME ZONE 'America/New_York')::date - 90));