-- ============================================================================
-- Migration 005 — Customer-exclusive models
-- ============================================================================
--
-- IMPORTANT: Run this in the Supabase SQL Editor BEFORE deploying the code that
-- depends on it.
--
-- Some catalogue models belong exclusively to a single customer (company). The
-- existing products.exclusive column already holds an UPPERCASE "sigla" imported
-- from Dataverse (cr56f_exclusive). This migration links that sigla to a company
-- via companies.exclusive_label, so:
--   - a model is exclusive  ⇔ products.exclusive is non-empty
--   - it is visible to a user ⇔ one of the user's companies has the matching
--     exclusive_label
--
-- Relationship is 1 company : N models (the label is unique per company).
-- ============================================================================

-- The customer "sigla" that marks which company a model is exclusive to.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exclusive_label TEXT;

-- One label belongs to exactly one company (case-insensitive, ignoring blanks).
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_exclusive_label
  ON companies (upper(exclusive_label))
  WHERE exclusive_label IS NOT NULL AND exclusive_label <> '';

-- Speeds up the per-user overlay query (products WHERE exclusive IN (labels)).
CREATE INDEX IF NOT EXISTS idx_products_exclusive
  ON products (exclusive)
  WHERE exclusive IS NOT NULL AND exclusive <> '';

-- ============================================================================
-- Reconciliation helper (run manually to inspect the existing siglas):
--
--   SELECT exclusive, COUNT(DISTINCT style_name) AS models, COUNT(*) AS rows
--   FROM products
--   WHERE exclusive IS NOT NULL AND exclusive <> ''
--   GROUP BY exclusive
--   ORDER BY exclusive;
--
-- Then assign each sigla to a company in /admin/companies (sets exclusive_label).
-- ============================================================================
