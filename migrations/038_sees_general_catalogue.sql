-- 038 — Company "sees general catalogue" flag (the legacy "*" rule).
--
-- In the old Power Pages portal a user saw the general Piedro catalogue only
-- when their sigla free-text (contact.adx_profilealertinstructions) contained a
-- "*". A client with siglas but NO "*" (e.g. ZSM) saw ONLY their own exclusive
-- models. The "*" was stripped on import, so we capture it as a column here.
--
-- Default TRUE preserves today's behaviour for every normal customer (no siglas
-- → still sees the general catalogue). The sync script flips it to FALSE for
-- companies that have exclusive siglas but whose contacts carry no "*".
--
-- Run in Supabase SQL editor BEFORE deploying code that reads the column, then
-- run scripts/sync-sees-general-catalogue.mjs --apply to populate it.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS sees_general_catalogue boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN companies.sees_general_catalogue IS
  'Whether this company sees the general Piedro catalogue on top of its own exclusives. Maps to the legacy "*" token in the Dataverse contact sigla text. FALSE = exclusive-only (e.g. ZSM).';
