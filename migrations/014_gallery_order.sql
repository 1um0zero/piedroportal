-- ============================================================================
-- Migration 014 — Gallery style ordering
-- ============================================================================
--
-- Lets a back-office user define the order in which models (styles) appear in
-- the gallery, per section (KIDS/MEN/WOMEN). The order is stored on products as
-- `gallery_position` (a small integer), kept identical across all colour
-- variants of a style. The gallery sorts by gallery_position ASC (NULLS LAST),
-- then colour_id, so un-ordered styles fall to the end alphabetically.
--
-- The admin orderer (/admin/products/order) writes positions per section via
-- the saveStyleOrder server action (service role).
-- Idempotent.
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_position int;

-- Speeds up the per-section ordered gallery query.
CREATE INDEX IF NOT EXISTS idx_products_section_position
  ON products (section, gallery_position);

-- ============================================================================
-- Verify:
--   SELECT style_name, section, gallery_position
--   FROM products WHERE gallery_position IS NOT NULL
--   ORDER BY section, gallery_position LIMIT 20;
-- ============================================================================
