-- ============================================================================
-- Migration 017 — STOCK products (buy-as-is from stock)
-- ============================================================================
--
-- A SEPARATE ordering scheme from the configured-order flow. STOCK shoes are
-- sold as-is: no additions, no patient, no L/R config. The user browses a grid
-- of in-stock style.colour, clicks sizes (one click = one pair) and submits.
-- One order may hold MANY style.colour. See docs/PROJECT-TRACKER.md §23.
--
-- Data model = Option 1 (independent), 3 new tables + a flag on products:
--   products.is_stock          — this colour is a STOCK item (from OUT/STOCK XLS col)
--   product_stock              — physical qty on hand per (product, size)
--   stock_orders               — order header (no `draft`; reserves on submit)
--   stock_order_items          — order lines (product + size + qty)
--
-- RESERVATION IS COMPUTED, NEVER DECREMENTED IN-APP:
--   available = product_stock.qty_on_hand
--             − Σ stock_order_items.qty of NON-TERMINAL stock_orders
-- Physical qty_on_hand is decremented externally (manual / XLS / future ERP),
-- and the order moves to a terminal state at the same time, so the on-hand drop
-- and the un-reserve happen together (no double-count). 'cancelled' un-reserves.
--
-- Service-role only (writes via hardened server actions). Idempotent.
-- ============================================================================

-- ── products: STOCK flag ──────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_stock boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_products_is_stock ON products (is_stock) WHERE is_stock;

-- ── product_stock: physical truth per (product, size) ─────────────────────
CREATE TABLE IF NOT EXISTS product_stock (
  product_id  uuid    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        numeric NOT NULL,                       -- EU/UK per products.size_unit
  qty_on_hand integer NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, size)
);

ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
-- No policies — only the service role (bypasses RLS) reads/writes it. Available
-- stock is computed server-side and exposed as a capped number, never raw rows.

-- ── stock_orders: order header ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id       uuid REFERENCES companies(id) ON DELETE SET NULL,
  -- No 'draft': stock orders reserve on submit. Default reflects that.
  status           text NOT NULL DEFAULT 'submitted',
  locale           text NOT NULL DEFAULT 'en',
  comments         text,
  -- Back-office columns mirror `orders` so the unified /orders view + admin
  -- workflow can treat both alike.
  approval_state   text DEFAULT 'registered',
  production_state text,
  piedro_order_id  text,
  piedro_notes     text,
  expected_dispatch_date date,
  pdf_url          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_orders ENABLE ROW LEVEL SECURITY;
-- Safety net mirroring `orders`: a user may read only their own if a query ever
-- runs with the anon key. Admin/company views use the service role.
DROP POLICY IF EXISTS stock_orders_select_own ON stock_orders;
CREATE POLICY stock_orders_select_own ON stock_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_stock_orders_user    ON stock_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_stock_orders_company ON stock_orders (company_id);
CREATE INDEX IF NOT EXISTS idx_stock_orders_status  ON stock_orders (status);

-- ── stock_order_items: order lines ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_order_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_order_id uuid    NOT NULL REFERENCES stock_orders(id) ON DELETE CASCADE,
  product_id     uuid    NOT NULL REFERENCES products(id),
  size           numeric NOT NULL,
  qty            integer NOT NULL CHECK (qty > 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stock_order_items ENABLE ROW LEVEL SECURITY;
-- No policies — read via the service role joined through stock_orders.

CREATE INDEX IF NOT EXISTS idx_stock_order_items_order   ON stock_order_items (stock_order_id);
-- Speeds up the reserved-stock aggregation (Σ qty per product+size of open orders).
CREATE INDEX IF NOT EXISTS idx_stock_order_items_product ON stock_order_items (product_id, size);

-- ============================================================================
-- Verify:
--   SELECT count(*) FROM products WHERE is_stock;
--   \d product_stock  \d stock_orders  \d stock_order_items
-- ============================================================================
