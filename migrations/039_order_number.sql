-- Migration 039 — human-readable sequential order number (restores the Dataverse legacy)
--
-- The Power Pages / Dataverse portal gave every order a name "YYYY-MM-DD-NNNN",
-- where NNNN was a GLOBAL sequential counter (independent of the date) the staff
-- and clients used to find orders. That number was never imported into the portal:
-- the import $select'd cr56f_name but never stored it, and there was no portal-side
-- sequential ID at all (only the random UUID `id`, the client's free-text
-- reference_customer, and the staff-filled piedro_order_id).
--
-- We restore it as a single integer `order_seq` (the NNNN). The date is NOT stored
-- — it was the reason the legacy ID was so wide — and is composed from created_at
-- only at display time when the old format is wanted. int handles scale natively
-- (well past NNNNNN). The sequence continues from the legacy maximum so there is no
-- rupture with the numbers already in circulation.
--
-- Assignment policy: a number is consumed on SUBMIT (never for drafts), so the
-- portal sequence stays gap-free going forward. Legacy gaps (drafts/TESTES that
-- consumed a Dataverse number but were never imported) are preserved as-is.
--
-- After this migration, run scripts/backfill-order-numbers.mjs, which fills every
-- existing order and then setval()s order_seq_counter to the final maximum.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_seq integer;

-- Unique when present; drafts (and any not-yet-numbered row) stay NULL.
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_seq_key ON orders (order_seq) WHERE order_seq IS NOT NULL;

-- Global counter for new submissions. Seeded to 1 here; the backfill script
-- setval()s it to MAX(order_seq) once all existing rows are numbered. nextval()
-- is called explicitly in insertOrderAction on submit (NOT a column DEFAULT, which
-- would burn a number on every draft insert).
CREATE SEQUENCE IF NOT EXISTS order_seq_counter AS integer START WITH 1;

-- Atomic "give me the next order number" — used by insertOrderAction on submit.
CREATE OR REPLACE FUNCTION next_order_number() RETURNS integer
  LANGUAGE sql AS $$ SELECT nextval('order_seq_counter')::integer $$;

-- Seed the counter to the current maximum — called by the backfill script.
CREATE OR REPLACE FUNCTION set_order_seq_counter(new_val integer) RETURNS void
  LANGUAGE sql AS $$ SELECT setval('order_seq_counter', new_val, true); $$;
