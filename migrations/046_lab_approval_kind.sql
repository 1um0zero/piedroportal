-- ─────────────────────────────────────────────────────────────────────────────
-- 046 · LAB approval sheets — "approval" kind (single-subject yes/no/discussion)
--
-- The original Lab sheet (migration 045) is an "alternatives" review: N options,
-- each marked Escolhido/Opção/Recusado. The CUSTOM leather sheet is different —
-- ONE subject (a painted maquette) gets ONE sheet-level verdict:
--   Aprovado / Rejeitado / Em discussão  (+ a comment).
--
-- New columns on lab_sheets:
--   kind          'alternatives' (default, existing) | 'approval' (new)
--   verdict       sheet-level outcome for approval kind (NULL until answered)
--   subject_data  JSONB snapshot the reviewer sees (e.g. maquette + leather map)
-- ─────────────────────────────────────────────────────────────────────────────

alter table lab_sheets
  add column if not exists kind text not null default 'alternatives'
    check (kind in ('alternatives', 'approval')),
  add column if not exists verdict text
    check (verdict in ('approved', 'rejected', 'discussion')),
  add column if not exists subject_data jsonb;
