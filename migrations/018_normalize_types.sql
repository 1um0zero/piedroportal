-- 018_normalize_types.sql
-- Canonicalise product types so the catalogue/filters never show duplicates like
-- "Boot" & "BOOT" or "SHOE" & "Shoes". Mirrors normalizeType() in
-- src/lib/products/excel-import.ts (case-merge + singular/plural synonyms +
-- Title case). Also fixes the type rows in `translations` so the gallery's
-- filter translations keep matching. Run once in the Supabase SQL editor.

begin;

-- 1) Products ---------------------------------------------------------------
update products set type = 'Shoes'  where upper(btrim(type)) in ('SHOE', 'SHOES');
update products set type = 'Boot'   where upper(btrim(type)) in ('BOOT', 'BOOTS');
update products set type = 'Sandal' where upper(btrim(type)) in ('SANDAL', 'SANDALS');
-- Anything else → Title case (Brogue, Slipper, …)
update products
   set type = upper(left(btrim(type), 1)) || lower(substr(btrim(type), 2))
 where type is not null and btrim(type) <> ''
   and type <> upper(left(btrim(type), 1)) || lower(substr(btrim(type), 2));

-- 2) translations (category = 'type') --------------------------------------
-- Drop non-canonical duplicates when the canonical key already exists, then
-- rename the survivors to the canonical value.
delete from translations t using translations c
 where t.category = 'type' and c.category = 'type' and t.ctid <> c.ctid
   and upper(btrim(t.key)) in ('SHOE', 'SHOES') and c.key = 'Shoes';
delete from translations t using translations c
 where t.category = 'type' and c.category = 'type' and t.ctid <> c.ctid
   and upper(btrim(t.key)) in ('BOOT', 'BOOTS') and c.key = 'Boot';
delete from translations t using translations c
 where t.category = 'type' and c.category = 'type' and t.ctid <> c.ctid
   and upper(btrim(t.key)) in ('SANDAL', 'SANDALS') and c.key = 'Sandal';

update translations set key = 'Shoes'  where category = 'type' and upper(btrim(key)) in ('SHOE', 'SHOES')   and key <> 'Shoes';
update translations set key = 'Boot'   where category = 'type' and upper(btrim(key)) in ('BOOT', 'BOOTS')   and key <> 'Boot';
update translations set key = 'Sandal' where category = 'type' and upper(btrim(key)) in ('SANDAL', 'SANDALS') and key <> 'Sandal';
update translations
   set key = upper(left(btrim(key), 1)) || lower(substr(btrim(key), 2))
 where category = 'type' and key is not null and btrim(key) <> ''
   and key <> upper(left(btrim(key), 1)) || lower(substr(btrim(key), 2));

commit;

-- Verify (each type should appear once):
--   select type, count(*) from products group by type order by type;
--   select key, en, nl, fr, de from translations where category = 'type' order by key;
