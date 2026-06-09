-- ============================================================================
-- Migration 015 — Size scale unit (EU / UK) per product
-- ============================================================================
--
-- Styles use different size scales: some EU (e.g. 24-46), some UK (e.g. 3-13½).
-- The portal was hard-coding "EU" everywhere, so UK styles showed "EU 5-13½".
-- This column stores the unit so the size can be labelled correctly. It is the
-- same across all colour variants of a style and is populated from Dataverse
-- (the style's size scale) by scripts/sync-size-scales.mjs.
--
-- NULL is treated as "EU" by the UI (back-compatible) until the sync runs.
-- Idempotent.
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS size_unit text;  -- 'EU' | 'UK' | NULL

-- ============================================================================
-- Verify:
--   SELECT size_unit, count(*) FROM products GROUP BY size_unit;
-- ============================================================================
