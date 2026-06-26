-- ============================================================================
-- Migration 045 — LAB approval sheets (folhas de aprovação)
-- ============================================================================
--
-- IMPORTANT: Execute this in the Supabase SQL Editor BEFORE deploying the code.
--
-- A LAB approval sheet presents a curated set of design ALTERNATIVES to a single
-- reviewer (e.g. Anabela). She marks each alternative with a verdict and may add
-- a comment; one overall comment closes the sheet. Jorge is notified by email on
-- response. The mechanic is the Foundation pattern; this instance is for Piedro.
--
--   Lifecycle: draft → sent → answered → closed_implemented | closed_cancelled
--   Verdicts:  chosen (favourite / no doubt) · option (valid alternative) ·
--              rejected (nem pensar) · NULL (unmarked)
--
-- Access model: the token URL never stops working. For `open_until` (2 business
-- days after sending) it opens WITHOUT login; afterwards the same link still
-- opens but requires the reviewer to authenticate. The window is computed in code
-- via addWorkingDays() (weekends + PT holidays).
-- ============================================================================

CREATE TABLE IF NOT EXISTS lab_sheets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_key         text NOT NULL,                  -- registry key → which component set renders the alternatives
  title           text NOT NULL,
  intro           text,                           -- optional note shown to the reviewer
  reviewer_name   text,
  reviewer_email  text,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','answered','closed_implemented','closed_cancelled')),
  token           uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  sent_at         timestamptz,
  open_until      date,                           -- last day the link opens without login
  overall_comment text,
  responded_at    timestamptz,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_options (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id  uuid NOT NULL REFERENCES lab_sheets(id) ON DELETE CASCADE,
  opt_key   text NOT NULL,                        -- matches the registry option key
  title     text NOT NULL,
  subtitle  text,
  position  int  NOT NULL DEFAULT 0,
  verdict   text CHECK (verdict IN ('chosen','option','rejected')),  -- reviewer's mark; NULL = unmarked
  comment   text,                                 -- reviewer's per-alternative comment
  UNIQUE (sheet_id, opt_key)
);

CREATE INDEX IF NOT EXISTS lab_sheets_token_idx  ON lab_sheets (token);
CREATE INDEX IF NOT EXISTS lab_sheets_status_idx ON lab_sheets (status);
CREATE INDEX IF NOT EXISTS lab_options_sheet_idx ON lab_options (sheet_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Restrictive by default. The reviewer (token) path runs through Server Actions
-- with the service-role client (bypasses RLS), so no anon policy is needed.
-- Authenticated back-office access is limited to Piedro/super admins.
ALTER TABLE lab_sheets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lab_sheets_admin  ON lab_sheets;
DROP POLICY IF EXISTS lab_options_admin ON lab_options;

CREATE POLICY lab_sheets_admin ON lab_sheets
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
                     AND p.role IN ('piedro_admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
                     AND p.role IN ('piedro_admin','super_admin')));

CREATE POLICY lab_options_admin ON lab_options
  FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
                     AND p.role IN ('piedro_admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
                     AND p.role IN ('piedro_admin','super_admin')));

-- ============================================================================
-- Verify:
--   SELECT id, title, status, open_until FROM lab_sheets ORDER BY created_at DESC;
-- ============================================================================
