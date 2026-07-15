-- 055_orders_list_indexes.sql
-- Speed up the orders LIST queries (/orders and /admin/orders).
--
-- Both lists page through `orders` ordered by `created_at DESC` within an optional
-- age/period window, and scope by owner or company:
--   * /admin/orders — ordered/ranged by created_at (whole table, minus others' drafts)
--   * /orders (regular user)   — WHERE user_id = $me       ORDER BY created_at DESC
--   * /orders (company admin)  — WHERE company_id IN (...)  ORDER BY created_at DESC
--
-- Without composite (scope, created_at) indexes Postgres filters then sorts a large
-- slice on every load. These DESC composite indexes let it walk rows already ordered.
--
-- NOTE: plain CREATE INDEX (not CONCURRENTLY). The Supabase SQL editor runs every
-- statement inside a transaction block, where CONCURRENTLY is rejected (25001).
-- `orders` is only a few thousand rows, so the brief build-time lock is negligible.

-- Ordering/range scan for the back-office list (and the global sort in general).
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders (created_at DESC);

-- Regular user: their own orders, newest first.
CREATE INDEX IF NOT EXISTS idx_orders_user_created_at
  ON public.orders (user_id, created_at DESC);

-- Company / branch admin: all orders of the scoped companies, newest first.
CREATE INDEX IF NOT EXISTS idx_orders_company_created_at
  ON public.orders (company_id, created_at DESC);
