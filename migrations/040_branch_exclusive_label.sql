-- ============================================================================
-- Migration 040 — Token-scoped branch offices (the UK market)
-- ============================================================================
--
-- IMPORTANT: Execute this migration in Supabase SQL Editor BEFORE deploying code.
--
-- The legacy branch model (migration 004, `branch_models`) scopes a back-office
-- staff member's catalogue by an explicit style_name INCLUSION/EXCLUSION list.
-- It cannot express "the general catalogue PLUS this branch's own exclusives",
-- which is exactly what the UK office needs:
--
--   UK staff/admin see ONLY: UK-exclusive products + the general orthopaedic
--   catalogue (shoes not exclusive to any client). NOT other clients' exclusives.
--
-- We model this by giving a branch an `exclusive_label` (its exclusivity sigla,
-- e.g. 'UK'). When set, the branch becomes TOKEN-SCOPED: its staff see every
-- model that is general OR carries that sigla — reusing the same token engine
-- (src/lib/exclusive.ts) that already gates the client gallery. A branch with a
-- NULL exclusive_label keeps the legacy branch_models behaviour untouched.
--
-- The matching CLIENT side already exists: UK customer companies get
-- companies.exclusive_label = 'UK' and companies.sees_general_catalogue = true
-- (migrations 016 + 038), so a logged-in UK client sees general + UK and an
-- anonymous visitor never sees UK models (exclusive rows are excluded from the
-- public cached gallery).
--
-- Access pattern: branches are read/written ONLY via the service-role client.
-- No RLS policies (mirrors migration 004).
-- ============================================================================

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS exclusive_label TEXT;

COMMENT ON COLUMN branches.exclusive_label IS
  'Exclusivity sigla of this branch (e.g. UK). When set, the branch is token-scoped: its staff see the general catalogue PLUS models carrying this sigla, and cannot manage the catalogue (read-only). NULL = legacy branch_models style scoping.';

-- ============================================================================
-- After running, wire the UK branch (adjust the name/code to your row):
--   UPDATE branches SET exclusive_label = 'UK' WHERE code = 'UK';
-- Then run scripts/setup-uk-market.mjs --apply to attach staff + label clients.
-- ============================================================================
