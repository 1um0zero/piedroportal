-- ─────────────────────────────────────────────────────────────────────────────
-- 058 — Announcements: WHO sees the message (audience)
--
-- Until now an announcement only carried `placement` (WHERE it shows). The
-- `after_login` placement is mounted in the locale layout, which wraps EVERY
-- logged-in page — so a client-facing notice (e.g. factory holidays) also
-- followed Piedro staff around the back-office.
--
-- `audience` is the missing WHO axis, orthogonal to placement:
--   clients → clinics/branch offices only (the default: nearly every message)
--   staff   → Piedro back-office only (piedro_admin/super_admin/staff_viewer)
--   all     → both
--
-- Default 'clients' is deliberate: it is the honest reading of every message
-- written so far, so existing rows stop showing in /admin without a data fix.
-- Anonymous visitors (homepage placement) count as clients.
--
-- NOTE: an admin impersonating a client ("View as") is resolved from the
-- stepped-into session, so they correctly see the client's messages.
-- ─────────────────────────────────────────────────────────────────────────────

alter table announcements
  add column if not exists audience text not null default 'clients'
    check (audience in ('all', 'clients', 'staff'));

-- The live lookup filters on (active, placement, audience); placement already
-- has its own GIN index, so audience rides along on the active index.
create index if not exists idx_announcements_audience
  on announcements (audience);
