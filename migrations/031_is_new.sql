-- 031_is_new.sql
-- Editorial "NEW" flag, curated per product (replaces the date-based new_until
-- guesswork). Seeded from the old portal's authoritative NewStyles list via
-- scripts/seed-new-styles.mjs and toggled in the back-office product list.
alter table public.products
  add column if not exists is_new boolean not null default false;
