-- ============================================================================
-- Expected-dispatch feature: factory closure calendar + per-order dispatch date
-- Run once in the Supabase SQL Editor.
-- ============================================================================

-- Days the factory does NOT work, ADDED BY ADMIN (weekends + PT national holidays
-- are computed in code, not stored here).
CREATE TABLE IF NOT EXISTS factory_closures (
  date       date PRIMARY KEY,
  kind       text NOT NULL DEFAULT 'closure',  -- 'closure' | 'vacation' | 'bridge'
  note       text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE factory_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read closures" ON factory_closures FOR SELECT USING (true);
CREATE POLICY "Admins manage closures" ON factory_closures FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
          AND profiles.role IN ('piedro_admin','super_admin'))
);

-- Expected dispatch date, computed at save time (cheap reads on /orders).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_dispatch_date date;
COMMENT ON COLUMN orders.expected_dispatch_date IS 'Order date + N working days (settings), skipping weekends, PT holidays and factory_closures. Recomputed if the calendar changes.';
