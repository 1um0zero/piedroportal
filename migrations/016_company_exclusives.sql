-- ============================================================================
-- Migration 016 — Company exclusivities (N:N) + user names
-- ============================================================================
--
-- A model's `products.exclusive` may hold one OR several siglas (e.g. "LIV KIV").
-- A company may hold several exclusivities, and one sigla (e.g. LIV = the
-- "Livingston" group) may belong to MANY companies — so the old single
-- `companies.exclusive_label` (unique) is not enough. This join table maps each
-- company to its sigla(s); visibility = token intersection between a product's
-- siglas and the union of the user's companies' siglas (piedro_admin sees all).
--
-- Also adds first/last name to profiles (Dataverse contacts have them; we only
-- had full_name).
--
-- Service-role only (read server-side via the service client). Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_exclusives (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  label      text NOT NULL,                 -- UPPERCASE sigla, e.g. 'ZSM', 'LIV'
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, label)
);

ALTER TABLE company_exclusives ENABLE ROW LEVEL SECURITY;
-- No policies on purpose — only the service role (bypasses RLS) reads/writes it.

CREATE INDEX IF NOT EXISTS idx_company_exclusives_label ON company_exclusives (label);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name  text;

-- ============================================================================
-- Verify:
--   SELECT label, count(*) FROM company_exclusives GROUP BY label ORDER BY 2 DESC;
-- ============================================================================
