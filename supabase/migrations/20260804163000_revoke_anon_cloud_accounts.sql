-- Defense-in-depth: revoke anon SELECT access to cloud_accounts.
--
-- The existing RLS policy on cloud_accounts is scoped TO authenticated only,
-- so anon already gets zero rows via RLS. This is a belt-and-suspenders fix to
-- close the gap for consistency with the rest of the schema and to guard against
-- any future RLS policy changes that might accidentally open a row to anon.
REVOKE SELECT ON public.cloud_accounts FROM anon;
