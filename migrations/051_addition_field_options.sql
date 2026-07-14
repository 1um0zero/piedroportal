-- ============================================================================
-- Migration 051 — `addition_field_options` table (editable option lists for the
--                 CUSTOM / Amendment Sole additions fields)
-- ============================================================================
--
-- Until now the option lists for the sole-amendment fields lived ONLY as static
-- `values: [...]` arrays in src/components/order/additions-config.ts. This table
-- turns four of them into back-office–editable lists (create/edit/disable/
-- reorder options + per-option image), managed at /admin/additions.
--
--   field_key ∈ { 'pu_type', 'sole_type', 'runner_sole', 'spoiler' }
--
-- ⚠ NAME NOTE: there is a DEAD, empty legacy table `addition_options` from an
--   abandoned early i18n attempt (supabase-migration-i18n.sql; its only reader,
--   src/lib/i18n-db.ts::getAdditionOptions, is never called). We deliberately use
--   a DISTINCT name here so this migration never touches that table.
--
-- ⚠ PHASE 1 SCOPE: this table is the editable SOURCE, seeded to exactly mirror
--   the current config. The order FORM is deliberately NOT wired to it yet — it
--   keeps reading additions-config.ts at runtime, so nothing about the customer
--   experience changes. Wiring the form to read from here (with a config
--   fallback) + associating option SETS to models is a later phase.
--
-- `value` is the canonical English string — it IS the ERP/Dataverse key (see
-- src/lib/dataverse-option-codes.ts, which maps code↔label by this exact string),
-- so it must never diverge from the config value while both coexist.
--
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS addition_field_options (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key   text NOT NULL,                 -- pu_type | sole_type | runner_sole | spoiler
  value       text NOT NULL,                 -- canonical English string = ERP/Dataverse key
  family      text,                          -- optional material family, for grouped display
  sort_order  int  NOT NULL DEFAULT 0,       -- chip order within the field
  image_path  text,                          -- '/soles/x.png' (legacy public) OR object name in the `additions` bucket
  label_nl    text,                          -- optional per-locale overrides (English-only today for sole/runner/spoiler)
  label_fr    text,
  label_de    text,
  active      boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_key, value)
);

CREATE INDEX IF NOT EXISTS addition_field_options_field_idx ON addition_field_options (field_key, sort_order);

-- ── Seed from the current config (family + A→Z order we just applied) ─────────
-- image_path is set for the values that already have a picture in
-- public/soles/manifest.json. pu_type images are gender-specific there
-- (PU Black::MEN vs ::WOMEN) so they are left NULL here — modelling the per-
-- section variant is a documented follow-up. ON CONFLICT DO NOTHING keeps this
-- re-runnable without clobbering later back-office edits.
INSERT INTO addition_field_options (field_key, value, family, sort_order, image_path) VALUES
  -- pu_type (PU/EVA Bumper) — family PU→EVA (matches the field name), A→Z within
  ('pu_type', 'PU Black',  'PU',  1, NULL),
  ('pu_type', 'PU White',  'PU',  2, NULL),
  ('pu_type', 'EVA Black', 'EVA', 3, NULL),
  ('pu_type', 'EVA White', 'EVA', 4, NULL),

  -- sole_type (Sole) — EVA → EVA Lightweight → Sportive → Full Rubber, A→Z within
  ('sole_type', 'EVA Black',              'EVA',             1, NULL),
  ('sole_type', 'EVA Brown',              'EVA',             2, NULL),
  ('sole_type', 'EVA Grey',               'EVA',             3, NULL),
  ('sole_type', 'EVA Taupe',              'EVA',             4, NULL),
  ('sole_type', 'EVA White',              'EVA',             5, NULL),
  ('sole_type', 'EVA Lightweight Amber',      'EVA Lightweight', 6, NULL),
  ('sole_type', 'EVA Lightweight Black',      'EVA Lightweight', 7, NULL),
  ('sole_type', 'EVA Lightweight Off-White',  'EVA Lightweight', 8, NULL),
  ('sole_type', 'EVA Lightweight Taupe',      'EVA Lightweight', 9, NULL),
  ('sole_type', 'Sportive Beige', 'Sportive', 10, NULL),
  ('sole_type', 'Sportive Black', 'Sportive', 11, NULL),
  ('sole_type', 'Sportive Grey',  'Sportive', 12, NULL),
  ('sole_type', 'Sportive White', 'Sportive', 13, NULL),
  ('sole_type', 'Full Rubber Amber', 'Full Rubber', 14, NULL),
  ('sole_type', 'Full Rubber Black', 'Full Rubber', 15, NULL),
  ('sole_type', 'Full Rubber Blue',  'Full Rubber', 16, NULL),
  ('sole_type', 'Full Rubber Pink',  'Full Rubber', 17, NULL),
  ('sole_type', 'Full Rubber White', 'Full Rubber', 18, NULL),

  -- spoiler (Spoiler) — flat colour list, A→Z (no family)
  ('spoiler', 'Amber',      NULL, 1, NULL),
  ('spoiler', 'Black',      NULL, 2, NULL),
  ('spoiler', 'Cobalt',     NULL, 3, NULL),
  ('spoiler', 'Dark Blue',  NULL, 4, NULL),
  ('spoiler', 'Dark Brown', NULL, 5, NULL),
  ('spoiler', 'Dark Grey',  NULL, 6, NULL),
  ('spoiler', 'Light Grey', NULL, 7, NULL),
  ('spoiler', 'Red',        NULL, 8, NULL),

  -- runner_sole (Runner sole) — family grouped, A→Z within; legacy images seeded
  ('runner_sole', 'Piedro Runner Amber', 'Piedro Runner', 1, '/soles/soleplate-tr-piedro-brown.png'),
  ('runner_sole', 'Piedro Runner Black', 'Piedro Runner', 2, '/soles/soleplate-tr-piedro-black.png'),
  ('runner_sole', 'Rubber Amber', 'Rubber', 3, NULL),
  ('runner_sole', 'Rubber Black', 'Rubber', 4, NULL),
  ('runner_sole', 'Fish Amber', 'Fish', 5, '/soles/rubber-sole-fish-amber.png'),
  ('runner_sole', 'Fish Black', 'Fish', 6, '/soles/rubber-sole-fish-black.png'),
  ('runner_sole', 'Tire Amber', 'Tire', 7, NULL),
  ('runner_sole', 'Tire Black', 'Tire', 8, NULL),
  ('runner_sole', 'EVA Nora Astro Star Lightweight Amber', 'EVA Nora Astro Star Lightweight', 9, NULL),
  ('runner_sole', 'EVA Nora Astro Star Lightweight Black', 'EVA Nora Astro Star Lightweight', 10, NULL),
  ('runner_sole', 'EVA Lightweight Port Flex Amber', 'EVA Lightweight Port Flex', 11, NULL),
  ('runner_sole', 'EVA Lightweight Port Flex Black', 'EVA Lightweight Port Flex', 12, NULL),
  ('runner_sole', 'Lightweight Vibram Sole Black', 'Lightweight Vibram Sole', 13, NULL),
  ('runner_sole', 'Lightweight Vibram Sole Brown', 'Lightweight Vibram Sole', 14, NULL),
  ('runner_sole', 'Lightweight Sole Forli Uomo', 'Lightweight Sole', 15, NULL),
  ('runner_sole', 'Full Rubber Sole Montana Black', 'Full Rubber Sole Montana', 16, NULL),
  ('runner_sole', 'Full Rubber Sole Montana Brown', 'Full Rubber Sole Montana', 17, NULL),
  ('runner_sole', 'Nora Sole Plate Black with Black Body Colour', 'Nora Sole Plate', 18, NULL),
  ('runner_sole', 'Nora Sole Plate Black with Light Body Colour', 'Nora Sole Plate', 19, NULL),
  ('runner_sole', 'Nora Sole Plate Blue with Light Body Colour', 'Nora Sole Plate', 20, NULL)
ON CONFLICT (field_key, value) DO NOTHING;

-- RLS: authenticated may read (a future phase will let the order form read this
-- directly); all writes go through the service role in hardened back-office
-- actions. Mirrors the `styles` table policy (migration 043).
ALTER TABLE addition_field_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS addition_field_options_select ON addition_field_options;
CREATE POLICY addition_field_options_select ON addition_field_options
  FOR SELECT TO authenticated
  USING (true);

-- keep updated_at fresh on any write
CREATE OR REPLACE FUNCTION set_addition_field_options_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_addition_field_options_updated_at ON addition_field_options;
CREATE TRIGGER trg_addition_field_options_updated_at
  BEFORE UPDATE ON addition_field_options
  FOR EACH ROW EXECUTE FUNCTION set_addition_field_options_updated_at();

-- ⚠ CLIENT ACTION: create a PUBLIC storage bucket named `additions`
--   (Supabase → Storage → New bucket → name "additions", Public). Uploaded option
--   images are stored as `<field_key>/<id>.png` and served via the public object
--   URL. Legacy images stay in public/soles/ and are referenced by their '/soles/…'
--   path until a later phase migrates them into the bucket.
-- ============================================================================
