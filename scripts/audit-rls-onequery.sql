-- ============================================================================
-- audit-rls-onequery.sql — READ-ONLY. Single result set (Supabase shows only the
-- LAST statement's output, so everything is UNION-ed into one table here).
-- Paste the whole thing, run once, copy the whole grid back.
-- Columns: section | item | detail
-- ============================================================================

-- 1) RLS flag per public table
SELECT '1_rls_flags'::text AS section,
       c.relname::text     AS item,
       ('rls=' || c.relrowsecurity || '  policies=' || COALESCE(p.cnt, 0))::text AS detail
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN (SELECT tablename, count(*) cnt FROM pg_policies WHERE schemaname='public' GROUP BY 1) p
       ON p.tablename = c.relname
WHERE n.nspname='public' AND c.relkind='r'

UNION ALL
-- 1b) RED FLAG: RLS on, zero policies (danger only if a CLIENT reads it)
SELECT '2_RED_rls_no_policy', c.relname::text,
       'RLS enabled but NO policy'::text
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.tablename=c.relname AND p.schemaname='public'
WHERE n.nspname='public' AND c.relkind='r'
  AND c.relrowsecurity=true AND p.policyname IS NULL

UNION ALL
-- 2) Policies in public (expr summary)
SELECT '3_policies', (tablename || ' · ' || policyname || ' · ' || cmd)::text,
       ('roles=' || array_to_string(roles, ',') ||
        '  using=' || COALESCE(qual, '∅') ||
        '  check=' || COALESCE(with_check, '∅'))::text
FROM pg_policies WHERE schemaname='public'

UNION ALL
-- 3) Storage buckets public/private
SELECT '4_buckets', name::text, ('public=' || public)::text
FROM storage.buckets

UNION ALL
-- 4) Storage policies
SELECT '5_storage_policies', (policyname || ' · ' || cmd)::text,
       ('roles=' || array_to_string(roles, ',') ||
        '  using=' || COALESCE(qual, '∅') ||
        '  check=' || COALESCE(with_check, '∅'))::text
FROM pg_policies WHERE schemaname='storage' AND tablename='objects'

UNION ALL
-- 5) Users with deprecated profiles.company_id but NO user_companies row
SELECT '6_orphan_company_users', p.email::text,
       ('role=' || p.role || '  deprecated_company_id=' || p.company_id)::text
FROM profiles p
LEFT JOIN user_companies uc ON uc.user_id = p.id
WHERE uc.user_id IS NULL AND p.company_id IS NOT NULL
  AND p.role IN ('user','company_admin')

ORDER BY section, item;
