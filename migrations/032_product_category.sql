-- 032_product_category.sql
-- Catalogue category (1..10) from Dataverse cr56f_category, used by the gallery
-- category filter and the piedro.com deep links (?category=N). NULL = uncategorised.
alter table public.products
  add column if not exists category smallint;
create index if not exists products_category_idx on public.products (category);
