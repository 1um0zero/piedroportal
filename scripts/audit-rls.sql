-- ============================================================================
-- audit-rls.sql — READ-ONLY production audit of RLS, policies and storage.
-- ============================================================================
--
-- Purpose: confirm the deployed database matches what the code assumes, so we
-- catch the "works for admin / fails for normal user" class before launch.
--
-- The app is service-role-centric (most reads/writes bypass RLS via the service
-- key with explicit server-side ownership checks). RLS is a safety net. A user
-- only hits RLS through the BROWSER/SERVER anon client, which today reads:
--     profiles (own) · orders (own) · user_companies (own) · companies (all auth)
--     · wishlist_items (own)
-- So the danger is: a table with RLS ENABLED but NO matching SELECT policy that
-- one of those client reads touches → empty/error for users, fine for admins.
--
-- HOW TO RUN: paste the whole file into the Supabase SQL editor and run. Nothing
-- is modified. Compare the output against the "EXPECTED" notes in each section.
-- ============================================================================

-- 1) RLS flag for every base table in `public`. ------------------------------
--    EXPECTED rowsecurity = true on: profiles, user_companies, orders,
--    companies, app_settings, company_exclusives, product_stock, stock_orders,
--    stock_order_items, password_reset_tokens.
--    ⚠ Look especially at wishlist_items — it has no migration. If RLS is OFF,
--      any authenticated user can read other users' wishlists (leak, not a
--      role-divergence). If ON, it MUST have an own-rows SELECT/INSERT/DELETE
--      policy or the wishlist silently breaks for everyone.
SELECT
  c.relname                                   AS table_name,
  c.relrowsecurity                            AS rls_enabled,
  c.relforcerowsecurity                       AS rls_forced,
  COALESCE(p.cnt, 0)                          AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN (
  SELECT schemaname, tablename, count(*) AS cnt
  FROM pg_policies WHERE schemaname = 'public' GROUP BY 1, 2
) p ON p.tablename = c.relname AND p.schemaname = n.nspname
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relrowsecurity DESC, c.relname;

-- 1b) RED FLAG list: tables with RLS ON but ZERO policies. Anything a client
--     reads that shows up here is broken for normal users. (Service-role-only
--     tables like product_stock / stock_order_items / password_reset_tokens are
--     EXPECTED here and are fine — they're never read with the anon key.)
SELECT c.relname AS table_with_rls_but_no_policy
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = 'public'
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relrowsecurity = true AND p.policyname IS NULL
ORDER BY c.relname;

-- 2) Every policy in `public`, with the actual USING / WITH CHECK expressions.
--    EXPECTED (at minimum):
--      profiles        SELECT  USING (id = auth.uid())
--      user_companies  SELECT  USING (user_id = auth.uid())
--      orders          SELECT  USING (user_id = auth.uid())
--      stock_orders    SELECT  USING (user_id = auth.uid())
--      companies       SELECT  USING (true)   [authenticated]
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual        AS using_expr,
  with_check  AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 3) Storage buckets — public vs private. -----------------------------------
--    EXPECTED: products = public (gallery); order-pdfs = private (signed URLs);
--    avatars (if used by profile photo) = check it allows the user to write
--    their own object; catalogues = public.
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- 4) Storage RLS policies (these live in the dashboard, not in the repo, so
--    they're the biggest blind spot for code review). A missing/over-narrow
--    policy here is a classic "user can't upload their avatar / can't open their
--    PDF, but admin can" bug.
SELECT
  policyname,
  cmd,
  roles,
  qual       AS using_expr,
  with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- 5) Sanity: does every profile that can order have a user_companies row?
--    The order submit validates membership against user_companies, NOT the
--    deprecated profiles.company_id. A user with a profiles.company_id but no
--    user_companies row will be able to FILL the form but the submit will fail
--    ("You do not have access to this company"). This lists exactly those users.
SELECT p.id, p.email, p.role, p.company_id AS deprecated_company_id
FROM profiles p
LEFT JOIN user_companies uc ON uc.user_id = p.id
WHERE uc.user_id IS NULL
  AND p.company_id IS NOT NULL
  AND p.role IN ('user', 'company_admin')
ORDER BY p.email;
