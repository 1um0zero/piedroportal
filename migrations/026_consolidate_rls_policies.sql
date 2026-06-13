-- ============================================================================
-- Migration 026 — Consolidate RLS policies (remove legacy cruft)
-- ============================================================================
--
-- The pre-launch audit (scripts/audit-rls-onequery.sql) found three generations
-- of overlapping policies on profiles / companies / orders, applied by repeated
-- migrations:
--   • orders   had 12 policies (EN + PT duplicates of own-select/insert/update,
--              plus admin/company policies built on the DEPRECATED
--              profiles.company_id — a safety net that no longer works since
--              migrated company_admins have company_id = NULL).
--   • profiles had 4, including an UPDATE policy `auth.uid() = id` with NO
--              WITH CHECK — this let a user update their OWN profile row via the
--              anon client, INCLUDING the `role` column → privilege escalation.
--              Profile writes go through a server action with a field whitelist
--              using the service role, so this policy is both redundant and
--              dangerous. REMOVED.
--   • companies had 3 identical "authenticated can read" SELECT policies.
--
-- The app is service-role-centric: every privileged/cross-tenant read+write goes
-- through the service key (bypasses RLS) with explicit server-side checks. RLS is
-- a SAFETY NET for the few reads issued with the anon/user-session client, which
-- only ever read OWN rows (+ the companies list). So the canonical set is the
-- minimal own-row SELECT, matching the original intent of migration 002.
--
-- This migration drops ALL policies on the three tables (dynamically, so no
-- legacy name is missed) and recreates exactly the canonical set. RLS stays
-- enabled. Idempotent.
--
-- ⚠ Untouched on purpose (already clean, distinct policies, no duplicates):
--   products, translations, addition_options, factory_closures, order_lines,
--   stock_orders, user_companies, wishlist_items.
-- ============================================================================

-- ── Drop every existing policy on the three messy tables ────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'companies', 'orders')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── profiles ────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Read own profile only. NO insert/update/delete policy: profile creation is the
-- signup trigger (SECURITY DEFINER); all updates go through the service role with
-- a field whitelist, so a user can never change their own role.
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ── companies ───────────────────────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Company names are low-sensitivity; the order form lists them with the
-- user-session client. Authenticated read only; all writes via the service role.
CREATE POLICY companies_select_authenticated ON companies
  FOR SELECT TO authenticated
  USING (true);

-- ── orders ──────────────────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Read own orders only — safety net for any anon-key read. Company-admin and
-- Piedro-admin order views use the service role with explicit checks, so they
-- need NO RLS policy here. NO write policies: every order write goes through a
-- hardened server action (service role) that forces user_id/status server-side.
CREATE POLICY orders_select_own ON orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- Verify after running — expect exactly: profiles=1, companies=1, orders=1.
--   SELECT tablename, count(*)
--   FROM pg_policies
--   WHERE schemaname='public' AND tablename IN ('profiles','companies','orders')
--   GROUP BY tablename ORDER BY tablename;
-- Then smoke-test as a normal user: open Gallery, place + view OWN order,
-- edit profile, set avatar. As company_admin/piedro_admin: order lists still
-- load (they use the service role).
-- ============================================================================
