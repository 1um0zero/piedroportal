-- ============================================================================
-- Migration 043 — `styles` table (model-level metadata)
-- ============================================================================
--
-- Until now "styles" were implicit: distinct products.style_name, with any
-- model-level attribute denormalized onto every colour row (e.g. gallery_position).
-- The CUSTOM leather selector needs genuinely model-level data — the maquette
-- (technical line-drawing) and the number of leather pieces/colours — so we give
-- styles their own table, one row per style_name.
--
-- Per Jorge (2026-06-28): start simple, NO per-style_colour override of num_colours
-- (trivial to add later); the count lives here at the model level.
--
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS styles (
  style_name   text PRIMARY KEY,
  num_colours  int CHECK (num_colours IS NULL OR num_colours BETWEEN 1 AND 30),
  maquette     text,                                   -- object name in the public `maquettes` bucket
  maquette_kind text CHECK (maquette_kind IN ('jpeg', 'svg')),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Seed one row per existing style_name (so every current model has a row to edit).
INSERT INTO styles (style_name)
SELECT DISTINCT style_name FROM products
ON CONFLICT (style_name) DO NOTHING;

-- RLS: authenticated may read (the gallery/selector reads maquette + num_colours);
-- all writes go through the service role in hardened back-office actions.
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS styles_select ON styles;
CREATE POLICY styles_select ON styles
  FOR SELECT TO authenticated
  USING (true);

-- ⚠ CLIENT ACTION: create a PUBLIC storage bucket named `maquettes`
--   (Supabase → Storage → New bucket → name "maquettes", Public). Maquette files
--   are stored as `<style_name>.<ext>` and served via the public object URL.
-- ============================================================================
