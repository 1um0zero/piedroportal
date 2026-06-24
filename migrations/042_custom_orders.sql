-- ============================================================================
-- Migration 042 — CUSTOM orders + additions normalization (Phase 2)
-- ============================================================================
--
-- Introduces the third order channel, CUSTOM (bespoke customisation on top of a
-- catalogue model — see docs/CUSTOM-ORDERS-DESIGN.md), and finally persists the
-- additions as a 1:N table (project_additions_normalization Phase 2). The shape
-- of `order_additions` is exactly what src/lib/additions-explode.ts already
-- emits, so the writer reuses that code path with no special case.
--
-- Decisions locked with Jorge (2026-06-24):
--   • CUSTOM parts from a base model → orders.product_id stays NOT NULL (no change).
--   • order_type discriminates PAIR / STOCK / CUSTOM on the shared header.
--   • ALL additions + measurements live in order_additions (section='measurements'
--     for the anthropometric block); no separate measurements table.
--   • Launch permissions = same as pair-by-pair (own-row RLS; privileged writes
--     via the service role), gating by company/model comes later.
--
-- Idempotent. Safe to re-run.
-- ============================================================================

-- ── 1) Order-type discriminator on the shared header ────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'PAIR'
    CHECK (order_type IN ('PAIR', 'STOCK', 'CUSTOM'));

-- Existing rows are the pair-by-pair flow → keep the 'PAIR' default. STOCK orders
-- live in their own tables (stock_orders) and are unaffected; 'STOCK' is reserved
-- here only so a future unification can reuse this column.

-- ── 2) order_additions — the persisted explodeAdditions() shape (1:N) ────────
CREATE TABLE IF NOT EXISTS order_additions (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id   uuid    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  section    text    NOT NULL,                 -- additions | upper | sole | others | measurements | custom-*
  field      text    NOT NULL,                 -- field key (e.g. 'hammer_toe', 'leg_ankle_circumference_120')
  parent     text,                             -- conditionalOn parent, for child fields
  side       char(1) NOT NULL CHECK (side IN ('l', 'r', 'g')),  -- 'g' = global (whole order)
  type       text    NOT NULL CHECK (type IN ('mm', 'option', 'text', 'toggle', 'image')),
  value_num  numeric,                          -- when type='mm'   (sortable/range-queryable for A-Shell)
  value_text text,                             -- when type='option' | 'text'
  value_bool boolean,                          -- when type='toggle'
  UNIQUE (order_id, field, side)
);

CREATE INDEX IF NOT EXISTS order_additions_order_idx ON order_additions(order_id);
CREATE INDEX IF NOT EXISTS order_additions_field_idx ON order_additions(field);

-- ── 3) RLS — mirror the canonical orders policy (migration 026) ──────────────
-- An addition row is readable iff its parent order is owned by the caller. All
-- privileged reads (company-admin, piedro-admin, branch) and ALL writes go
-- through the service role with explicit server-side checks, so — exactly like
-- `orders` — we add only the own-row SELECT safety net and NO write policies.
ALTER TABLE order_additions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_additions_select_own ON order_additions;
CREATE POLICY order_additions_select_own ON order_additions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_additions.order_id
        AND o.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Verify after running:
--   SELECT order_type, count(*) FROM orders GROUP BY order_type;       -- all PAIR for now
--   SELECT count(*) FROM order_additions;                             -- 0 until first CUSTOM order
--   SELECT polname FROM pg_policy WHERE polrelid = 'order_additions'::regclass;  -- one: _select_own
-- Backfill of existing PAIR orders into order_additions is OPTIONAL and lives in
-- a separate script (explodeAdditions over orders.additions) — CUSTOM needs none.
-- ============================================================================
