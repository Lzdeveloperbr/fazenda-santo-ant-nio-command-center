-- The access-code hash is only needed by the SECURITY DEFINER signup trigger.
-- Authenticated farm members must never be able to read hashes directly.
DROP POLICY IF EXISTS "members view farm access codes" ON public.farm_access_codes;
REVOKE ALL ON TABLE public.farm_access_codes FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.farm_access_codes TO service_role;

-- Verification after applying in a staging database:
-- SELECT has_table_privilege('authenticated', 'public.farm_access_codes', 'SELECT');
-- Expected: false.
-- Also verify signup succeeds with a valid code and rejects an invalid code.
