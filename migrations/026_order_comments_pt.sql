-- Migration 026 — Portuguese translation cache for order comments
-- Clinic comments arrive in the clinic's language (IT/NL/EN/…). The ERP grid
-- (A-Shell, in PT) reads comments_pt; it's filled on demand by the ERP export
-- via Claude (Haiku) and cached here so we translate each comment only once.
-- comments_pt_hash holds a hash of the source that produced comments_pt, so an
-- edited comment is re-translated automatically.
-- Run once in the Supabase SQL Editor.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS comments_pt text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comments_pt_hash text;
COMMENT ON COLUMN orders.comments_pt IS 'PT translation of comments (cached; filled by the ERP export via Claude).';
COMMENT ON COLUMN orders.comments_pt_hash IS 'Hash of the source comment that produced comments_pt (re-translate when it changes).';
