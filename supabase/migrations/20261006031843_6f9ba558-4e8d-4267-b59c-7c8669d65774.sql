DROP POLICY IF EXISTS "anon submit issues" ON public.issue_reports;
REVOKE INSERT, UPDATE, DELETE, SELECT ON public.issue_reports FROM anon, authenticated;
GRANT ALL ON public.issue_reports TO service_role;