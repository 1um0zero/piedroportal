# UK Market — Design (branch-driven, portal-owned)

> Status: BUILT (2026-06-23, commit 0310821). Source of truth = the Portal.
> Dataverse is fully retired as an import source — nothing more comes from it;
> UK is a new, portal-managed reality.

## Goal

Make the **UK branch back-office the single surface** to manage what is "UK".
Assigning a client, a style, or an individual style-colour to UK is the only
action a manager performs; visibility everywhere follows automatically.

Anabela's rules (unchanged):
- UK clients see general (NL/INT) **+** UK. NL/INT clients never see UK.
  Anonymous visitors never see UK.
- UK staff/admin see only UK orders + UK products + the general (un-exclusive)
  catalogue; cannot manage products (read-only).
- Anabela (piedro_admin) sees everything.

## Principle: materialize, don't derive

Because Dataverse no longer writes these columns, the simplest robust design is
to **materialize the `UK` token into the existing columns** on assign/unassign,
and reuse every existing visibility path with **zero read-side changes**:

| Dimension | Membership stored as | Drives |
|---|---|---|
| Client (company) | `companies.exclusive_label` contains `UK` + `sees_general_catalogue=true` | client gallery (general + UK), order guard |
| Style | `products.exclusive` contains `UK` on **all** colour rows of the style | gallery, public-exclusion, back-office scope |
| Style-colour | `products.exclusive` contains `UK` on **that** colour row | per-colour granularity |
| Branch marker | `branches.exclusive_label='UK'` (migration 040, done) | UK staff scope (general + UK), read-only |
| On-behalf (optional) | `branch_companies` link | UK staff placing/seeing UK clients' orders |

The token is **additive**: assign = add `UK` to the token set (so `LIV UK` stays
valid); unassign = drop `UK`, keep the rest. Manipulate via `exclusiveTokens()`
in `src/lib/exclusive.ts`. No new tables.

### Why materialize beats derive here
- The public gallery excludes exclusives by a **SQL** predicate on
  `products.exclusive` (`exclusive is null/empty`). A derived-only token would
  leak UK models to anonymous visitors. Materializing keeps that guard intact.
- All client/back-office visibility already keys on these columns. No refactor.

## UI — branch detail (`/admin/branches/[id]`, token-scoped branch only)

Two panels, **piedro_admin only** (UK staff are read-only):

1. **Clients** — search companies; assign/unassign. Assign sets
   `exclusive_label += UK` + `sees_general_catalogue=true` (= the legacy `UK *`)
   **and creates the `branch_companies` link** (CONFIRMED 2026-06-23: at UK launch
   the staff register orders **on-behalf** of UK clients, so the link is required,
   not optional). Lists current UK clients.

2. **Models — expandable Style → Colour grid.** This corrects the original
   branch_office simplification: association was style-only, but exclusivity is
   really per **Style.Colour**. So the grid lists styles, each **expandable to its
   colours**; you select specific colours OR tick "all colours" of a style. A
   style row shows state **none / partial / full UK** and an indeterminate tick
   when partial. Assign/unassign materializes `products.exclusive += / -= UK` on
   the affected colour rows. Covers mixed styles (e.g. `2089.9980` UK,
   `2089.4437` general) and the common "all of this style" case in one control.

> Note: this expand-to-colour grid is the correct shape for ANY customer
> exclusivity (ZSM, KIV…), not just UK — the style-only `branch_models` grid was
> a launch-time shortcut. For UK we drive it purely via `products.exclusive`
> (token-scoped branch), not `branch_models`.

## Server actions (new, piedro_admin-guarded)
- `assignCompanyToUk(companyId)` / `removeCompanyFromUk(companyId)`
  — token on the company **+** `branch_companies` link (on-behalf).
- `setColoursUk(colourIds[], on)` — add/remove `UK` on a batch of colour rows
  (the grid sends the colours of a style, or a subset). "All colours" = the
  style's full colour set.

Each adds/removes the `UK` token (additive, via `exclusiveTokens`) and
revalidates. Warn before overwriting a row that already carries a *different*
customer sigla.

## Import path (Excel / cr56f_exclusive)
UK products may also arrive via the existing Excel import: the `cr56f_exclusive`
column carries `UK` and, since every import row is a `colour_id`, the marking is
inherently per **Style.Colour** — no special handling. The branch grid above is
the interactive equivalent for products already in the catalogue.

## What already exists (no work)
- `branches.exclusive_label` + token-scoped back-office scope + read-only guards
  (migration 040 + scope.ts, shipped 2026-06-23).
- Client visibility via `exclusive_label` + `sees_general_catalogue`.
- Per-colour `exclusive` editing on the product edit page (panel 3 can reuse it).

## Retired
- `cr56f_exclusive` / contact `UK *` hand-entry: not used for UK.
- `sync-exclusives.mjs`, `sync-sees-general-catalogue.mjs`: legacy (Dataverse
  retired). Do NOT run them against UK data — they would clobber portal-owned tokens.

## Open / later
- In-portal **client creation** UI (UK + the NL VSI→ERP→Portal circuit) — separate
  backlog, see project_uk_market memory.
- Whether UK staff also need on-behalf ordering (decides if `branch_companies`
  link is required or just optional).
