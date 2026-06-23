# UK Market — Design (branch-driven, portal-owned)

> Status: DESIGN ONLY (2026-06-23). Not built. Source of truth = the Portal.
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

Three panels, **piedro_admin only** (UK staff are read-only):

1. **Clients** — search companies; assign/unassign. Assign sets
   `exclusive_label += UK` + `sees_general_catalogue=true` (= the legacy `UK *`),
   and links `branch_companies` for on-behalf. Lists current UK clients.
2. **Styles** — search styles; assign sets `products.exclusive += UK` on every
   colour of the style; unassign clears `UK`. Shows colour count + state
   (none / partial / full UK).
3. **Colours** — within a style (or a colour search), toggle individual
   `colour_id` rows to UK. Covers mixed styles (e.g. `2089.9980` UK, `2089.4437`
   general). The Styles panel is just "all colours" of this.

## Server actions (new, piedro_admin-guarded)
- `assignCompanyToUk(companyId)` / `removeCompanyFromUk(companyId)`
- `assignStyleToUk(styleName)` / `removeStyleFromUk(styleName)`
- `assignColourToUk(colourId)` / `removeColourFromUk(colourId)`

Each adds/removes the `UK` token (additive) and revalidates. Warn before
overwriting a row that already carries a *different* customer sigla.

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
