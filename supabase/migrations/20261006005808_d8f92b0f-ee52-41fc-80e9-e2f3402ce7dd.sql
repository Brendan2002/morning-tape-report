CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE (user_id, role));
GRANT SELECT ON public.user_roles TO authenticated; GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY "public insert wl" ON public.watchlist;
DROP POLICY "public delete wl" ON public.watchlist;
REVOKE INSERT, UPDATE, DELETE ON public.watchlist FROM anon;
GRANT SELECT ON public.watchlist TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist TO authenticated;
CREATE POLICY "admin insert wl" ON public.watchlist FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update wl" ON public.watchlist FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete wl" ON public.watchlist FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.reports FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.calendar_events FROM anon, authenticated;

CREATE TABLE public.issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  issue_type text NOT NULL CHECK (issue_type IN ('wrong_number','broken_link','typo','outdated_data','other')),
  page_url text NOT NULL CHECK (char_length(page_url) <= 500),
  report_date date,
  field text CHECK (char_length(field) <= 200),
  displayed_value text CHECK (char_length(displayed_value) <= 200),
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  reporter_email text CHECK (reporter_email IS NULL OR (char_length(reporter_email) <= 255 AND reporter_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  status text NOT NULL DEFAULT 'new',
  user_agent text CHECK (char_length(user_agent) <= 500),
  ip_hash text,
  email_status text
);
CREATE INDEX issue_reports_ip_time ON public.issue_reports (ip_hash, created_at);
GRANT INSERT ON public.issue_reports TO anon, authenticated; GRANT ALL ON public.issue_reports TO service_role;
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon submit issues" ON public.issue_reports FOR INSERT TO anon, authenticated WITH CHECK (status = 'new' AND ip_hash IS NULL AND email_status IS NULL);