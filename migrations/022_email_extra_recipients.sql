-- ─────────────────────────────────────────────────────────────────────────────
-- 022 — Campaign-level extra To / Cc / Bcc addresses (comma-separated lists),
-- added to every e-mail the campaign sends. For bulk audiences each main
-- recipient goes in Bcc (To = sender), so these extras define the visible
-- header addresses.
-- ─────────────────────────────────────────────────────────────────────────────

alter table email_campaigns add column if not exists extra_to  text;
alter table email_campaigns add column if not exists extra_cc  text;
alter table email_campaigns add column if not exists extra_bcc text;
