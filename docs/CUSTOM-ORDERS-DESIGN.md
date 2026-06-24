# CUSTOM Orders — Architecture & Migration Proposal

> **Status:** PROPOSAL (2026-06-24). Written overnight for Jorge to validate.
> No schema or data was touched. SQL below is **not applied** — it is migration
> `042` ready to run in Supabase SQL Editor *after* sign-off.
>
> **UPDATE 2026-06-24 (overnight):** I now have **autonomous read access** to the
> Dev environment (`https://orgc86abc8f.crm4.dynamics.com`) — the service
> principal is already an Application User there (`WhoAmI` → 200). I pulled the
> real structure myself; no copy-paste needed. Findings in [§0](#0-what-i-found-in-the-dev-environment).

---

## 0. What I found in the Dev environment

Pulled live via OData from `orgc86abc8f.crm4.dynamics.com` (publisher prefix
`cr56f_`, same as Production):

- **The CUSTOM order table = `cr56f_wpp_custom_orders`** (entity set
  `cr56f_wpp_custom_orderses`).
- **402 custom attributes.** Full dump in
  [`docs/custom-orders-dev-fields.json`](custom-orders-dev-fields.json).
- The labels are **section-numbered** (`22.x leg_ankle_circumference`,
  `25.x toe_shape_*`, `332 ball_lateral`, …) and **sided by `LF`/`RF` suffix**
  (left foot / right foot) — the Dev equivalent of our `{l,r}`.
- It is **far richer than PAIR**: not just additions but **anthropometric
  measurements** — ankle/leg circumferences at multiple heights (120/150/200/
  250/300/350 mm), ball widths, toe-shape booleans, etc. Mostly `Integer` (mm)
  and `Boolean` (toggles), with `Virtual` companion fields (`*name`) = the
  Power Pages display label for each option.

**This decisively confirms the design choice:** 402 columns must NOT live on the
shared `orders` row. Isolate. The `LF/RF` + section-number convention maps
cleanly onto our existing `side ∈ {l,r,g}` + `section` model, so
`order_additions` absorbs CUSTOM with no schema gymnastics.

The form **jscript** (conditional show/require logic) is being pulled from
`webresourceset` into `docs/custom-orders-jscript/`.

---

## 1. What CUSTOM is

A third order channel, alongside the two that already exist:

| Channel | What it is | Storage today |
|---|---|---|
| **PAIR** (pair-by-pair) | Catalogue product + orthopaedic additions per foot | `orders` (wide row) + `additions` JSONB |
| **STOCK** | Buy-as-is from physical stock | `stock_orders` + `stock_order_items` (1:N) |
| **CUSTOM** ← *new* | A much larger additions form; bespoke/made-to-measure, **not** tied to a catalogue product the same way | *to be decided here* |

CUSTOM = "an Additions form with many more fields", as a distinct area. The
client confirmed there are **no real CUSTOM orders to import from Dataverse** —
so we have **total design freedom** and zero migration cost. This is the ideal
moment to fix the data model the right way.

---

## 2. The core decision — isolate the additions (recommended)

> **Recommendation: do NOT keep growing the wide `orders` row. Isolate additions
> into a 1:N table now, with CUSTOM as the first consumer.**

### Why this is the obvious moment

This is **not a new idea** — it is [[project_additions_normalization]], already
DECIDED, already half-built:

- [`src/lib/additions-explode.ts`](../src/lib/additions-explode.ts) is **Phase 1**.
  `explodeAdditions()` already turns the wide `additions` JSONB into the exact
  1:N shape (`ErpAddition`: `section · field · parent · side · type · value`),
  derived on the fly for the A-Shell/ERP contract.
- Its own header comment says: *"Phase 2 will persist this exact shape in an
  `order_additions` table without changing this output."*

**CUSTOM is the trigger for Phase 2.** Three reasons it's safe and cheap *now*:

1. **No legacy CUSTOM data to migrate** (Jorge confirmed) → the new table starts
   clean; PAIR can be backfilled later, on its own schedule, with the same
   `explodeAdditions()` we already trust.
2. CUSTOM has *many more* fields. Adding dozens of columns (or bloating the JSONB)
   on the shared `orders` row is exactly the anti-pattern we agreed to avoid
   before A-Shell goes two-way.
3. The ERP contract ([[project_vsi_erp_integration]]) already speaks the 1:N
   shape. Persisting it removes the "explode on every read" cost and gives
   A-Shell a stable table to pull.

### The shape

Keep `orders` as the **common header**; move additions **out** into a 1:N table
shared by PAIR and CUSTOM.

```
orders  (header — unchanged columns + 1 discriminator)
  id, user_id, company_id, status, locale, order_seq, created_at, …
  order_type  ← NEW:  'PAIR' | 'STOCK' | 'CUSTOM'   (default 'PAIR')
  product_id  ← stays NULLable; CUSTOM may have no catalogue product
  unit, clinician, patient_name, reference_customer, quantity,
  construction_*, width_*, size_*, diff_sizes_pairs, comments
  additions (JSONB) ← kept during transition; becomes derived/legacy after Phase 2 backfill

order_additions  (1:N — NEW, the persisted explodeAdditions() shape)
  id            bigint PK
  order_id      uuid  FK → orders(id) ON DELETE CASCADE
  section       text  -- additions | upper | sole | others | custom-*
  field         text  -- field key (e.g. 'hammer_toe')
  parent        text  -- conditionalOn parent, nullable
  side          char  -- 'l' | 'r' | 'g'
  type          text  -- mm | option | text | toggle | image
  value_num     numeric  -- when type='mm'
  value_text    text     -- when type='option'|'text'
  value_bool    boolean  -- when type='toggle'
  UNIQUE (order_id, field, side)
```

> **Typed value columns, not a single `value text`** — keeps mm sortable/range-
> queryable for A-Shell and avoids string-parsing in the ERP. `explodeAdditions`
> already knows the `type`, so the writer picks the column.

### What this is NOT

- **Not** a giant `orders` row with dozens of new columns. ❌
- **Not** a parallel `custom_orders` table that forks the whole order lifecycle.
  CUSTOM reuses the same header, status machine, order numbering, dispatch
  counter, PDF/email and ERP push — only the *additions payload* is richer. ✅

---

## 3. Where the CUSTOM area lives — separate & beta first

> **Recommendation: ship CUSTOM isolated, behind a feature flag, in an admin/beta
> zone first — then promote.** Same playbook as `/homenew` ([[project_homenew]]).

- **Route:** `/[locale]/admin/custom` (or `/custom` flagged) — visible only to
  super_admin / piedro_admin until validated.
- **Form:** a CUSTOM-mode of `AdditionsForm`, driven by `additions-config.ts`
  extended with the Dev-environment fields, marked `custom: true` so they only
  surface in this channel.
- **Reuse, don't fork:** header, `insertOrderAction`, status flow, PDF, email.
  The writer just sets `order_type: 'CUSTOM'` and writes the richer
  `order_additions` rows.

Once Anabela/Piedro validate the beta, flip the flag to expose it to clients
(possibly gated by company, like exclusives).

---

## 4. `additions-config.ts` stays the single source of truth

The config is already the canon for field types, valid values, Dataverse keys,
i18n labels and GLB refs. CUSTOM fields get added **there**, with:

- `custom: true` — channel marker (hidden in PAIR, shown in CUSTOM).
- the same `section / type / side / conditionalOn` vocabulary `explodeAdditions`
  consumes — so the new table is written by the **same code path**, no special
  case.

The Dev-environment jscript matters most for **conditional logic** (which fields
show/require based on others) — Power Pages keeps that in the form web resource,
not in the column metadata. I translate those rules into `conditionalOn` +
validation in the config.

---

## 5. Migration `042` (DRAFT — do not run yet)

```sql
-- migrations/042_custom_orders.sql  (PROPOSAL — run only after sign-off)

-- 1) Discriminator on the shared header
alter table orders
  add column if not exists order_type text not null default 'PAIR'
    check (order_type in ('PAIR','STOCK','CUSTOM'));

-- product_id already nullable? confirm; CUSTOM may carry none.
-- alter table orders alter column product_id drop not null;  -- only if currently NOT NULL

-- 2) The 1:N additions table (persisted explodeAdditions() shape)
create table if not exists order_additions (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references orders(id) on delete cascade,
  section    text not null,
  field      text not null,
  parent     text,
  side       char(1) not null check (side in ('l','r','g')),
  type       text not null check (type in ('mm','option','text','toggle','image')),
  value_num  numeric,
  value_text text,
  value_bool boolean,
  unique (order_id, field, side)
);
create index if not exists order_additions_order_idx on order_additions(order_id);
create index if not exists order_additions_field_idx on order_additions(field);

-- 3) RLS — mirror orders' canonical policy (see migration 026). An addition row
--    is visible/writable iff its parent order is. (Policies drafted, not shown
--    here; will copy the order policy pattern exactly.)
alter table order_additions enable row level security;
```

**Backfill (separate, optional, later):** run `explodeAdditions()` over existing
PAIR orders to populate `order_additions`, then treat JSONB as legacy. CUSTOM
needs none of this.

---

## 6. Pulling the Dev environment myself

I authenticate to Dataverse via a **service principal** (client-credentials) in
`.env.local` — same app reg works for any org in tenant `c6b359c8…`. Today it
points at **Production** (`org38182053.crm4.dynamics.com`). To read the CUSTOM
beta I need, from Jorge:

1. **The Development environment URL** (Power Platform Admin Center → Environments
   → Development → Environment URL).
2. The same app added as an **Application User** there (System Customizer role is
   enough). If already added, just the URL.

Then I pull **both** sides via OData — no copy-paste:

- **Fields:** `EntityDefinitions` / `Attributes` for the CUSTOM table.
- **The jscript:** `webresourceset` (`content` is base64) — gives me the exact
  form client logic so I reproduce the conditional/validation rules in
  `additions-config.ts`.

A throwaway `scripts/dataverse-custom-discover.mjs` (clone of
`dataverse-discover.mjs` with `DATAVERSE_DEV_URL`) does this in one run.

---

## 7. Open questions for Jorge (answer when awake)

1. **Catalogue link?** Does a CUSTOM order reference a base model/last, or is it
   fully bespoke (no `product_id`)? Decides whether `product_id` stays nullable.
2. **Who orders CUSTOM** — all clients eventually, or specific companies/branches
   (exclusivity-style gating)?
3. **Pricing / measurements** — does the Dev form capture measurements (foot
   length, circumferences) that need their own typed fields, or are they all
   "additions"?
4. **Sided?** Are CUSTOM fields L/R-sided like PAIR, or per-order globals?

---

## 8. Suggested first steps (the "por onde começamos")

1. ✅ **This doc** — architecture decided, awaiting sign-off.
2. ⏳ Jorge drops the **Dev URL** → I pull fields + jscript.
3. Extend `additions-config.ts` with CUSTOM fields (`custom: true`).
4. Run migration `042` (after review).
5. Scaffold `/admin/custom` beta route + CUSTOM-mode `AdditionsForm`.
6. Wire the writer to persist `order_additions` (Phase 2) for CUSTOM.
7. Backfill PAIR into `order_additions` (optional, later).
8. Validate with Anabela → promote out of beta.
```
