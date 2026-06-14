-- ============================================================================
-- Migration 027 — Company country + address (from Dataverse accounts)
-- ============================================================================
--
-- The Dataverse `account` carries an address; ~96% have a country, ~90% a city
-- and ~95% a street line. We never imported any of it. Country is important for
-- per-country analysis (and for targeting NL-only notices such as the NVOS
-- approval status). The raw Dataverse country is messy free text in several
-- languages (NL, NEDERLANDS, HOLANDA, "HOLANDA NLS 02", NETHERLANDS, …), so the
-- importer normalises it: `country_code` holds a canonical ISO-3166 alpha-2 and
-- `country` a canonical English name, while `country_raw` keeps the original for
-- audit. Account email/phone/website are empty (those live on contacts), so we
-- intentionally do not add columns for them.
--
-- All columns nullable, idempotent. RLS already governs `companies` (mig 026).
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS country_code  text;  -- ISO 3166-1 alpha-2, e.g. 'NL'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country       text;  -- canonical English name, e.g. 'Netherlands'
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country_raw   text;  -- original Dataverse value (audit)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city          text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line1 text;

CREATE INDEX IF NOT EXISTS idx_companies_country_code ON companies (country_code);

-- ============================================================================
-- Verify (after re-running scripts/import-accounts.mjs):
--   SELECT country_code, country, count(*) FROM companies
--   GROUP BY 1,2 ORDER BY 3 DESC;
--   -- unmapped raw values still needing a rule:
--   SELECT country_raw, count(*) FROM companies
--   WHERE country_code IS NULL AND country_raw IS NOT NULL
--   GROUP BY 1 ORDER BY 2 DESC;
-- ============================================================================
