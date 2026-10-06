DROP POLICY "public read wl" ON public.watchlist;
REVOKE SELECT ON public.watchlist FROM anon;
CREATE POLICY "admin read wl" ON public.watchlist FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));