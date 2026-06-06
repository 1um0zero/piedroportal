# ERP (a-shell) order integration — Option B (portal → ERP pull)

**Goal:** a-shell stops importing orders from Dataverse and instead pulls them **directly from the
portal**, removing Dataverse from the order path and fixing the recurring import flaws at the source.

> Status: **scaffolding built 2026-06-06.** Endpoints + contract + dedup marker are in place.
> Pending your answers (Q6.2 flaw list, Q6.3 how a-shell pulls/authes today) to finish-tune the
> contract and to decide whether status flows back from the ERP.

---

## Endpoints

Both require `Authorization: Bearer <ERP_API_TOKEN>` (set `ERP_API_TOKEN` in Vercel prod env — a long
random secret). They fail closed if the token is unset.

### `GET /api/erp/orders` — pull orders to import
Query params:
| param | default | meaning |
|---|---|---|
| `pending` | `1` | only orders not yet exported (`erp_exported_at IS NULL`) |
| `all` | – | `all=1` includes already-exported orders (overrides `pending`) |
| `status` | `submitted,approved` | CSV of order statuses to include |
| `since` | – | ISO timestamp; only orders updated at/after it |
| `limit` | `200` | max rows (cap 1000) |

Response: `{ contract_version, count, orders: ErpOrder[] }`.

### `POST /api/erp/orders/ack` — confirm import
Body: `{ "order_ids": ["uuid", ...] }`. Sets `erp_exported_at = now()` so those orders stop appearing
in the pending feed. Response: `{ acknowledged: n }`.

### `POST /api/erp/orders/status` — write order state back (Q6.4) ✅ built
Body: `{ order_id, production_state?, approval_state?, piedro_order_id?, piedro_notes? }`. Only the
provided fields are updated; `orders.status` is kept in sync. Idempotent — replaces the brittle
Dataverse status-update path (a source of the current update errors, Q6.2). Response: `{ ok, id }`.

---

## The flow (kills the classic import flaws)

```
loop:
  GET /api/erp/orders?pending=1&limit=200      → orders[]
  for each order: create/update in a-shell by order_id (idempotent upsert)
  POST /api/erp/orders/ack { order_ids:[...] } ← only AFTER successful import
```

- **No duplicates:** dedup on `order_id` (stable portal UUID) + the `erp_exported_at` marker.
- **No lost orders:** ack is explicit *after* a successful import — an ERP crash mid-batch just means
  the orders reappear next pull (at-least-once + idempotent upsert = exactly-once effect).
- **Stable contract:** a-shell depends only on `ErpOrder` (below), never on portal column names.
  `contract_version` lets us evolve safely.

## `ErpOrder` contract (v1)
See `src/lib/erp/order-contract.ts`. Fields:
`order_id, dataverse_id, piedro_order_id, status, approval_state, production_state, urgent,
company{id,erp_code,name}, product{id,style_name,colour_id}, unit, clinician, patient_name,
reference_customer, quantity, size{left,right}, construction{left,right}, width{left,right},
comments, additions, created_at, updated_at, exported_at`.

`dataverse_id` is included so a-shell can reconcile with whatever it already imported from Dataverse
during the transition. `additions` is the raw JSONB (same shape as `additions-config.ts`).

## Migration
Run `migrations/007_erp_export.sql` (adds `orders.erp_exported_at` + index).

## Open questions to finalise (from the questionnaire)
- **Q6.2** Which exact flaws to eliminate? (so we can assert them in the contract / add validation)
- **Q6.3** How does a-shell authenticate & pull today, and can its import code change before Monday?
  If not changeable in time → temporary bridge / manual CSV export from the same data while B lands.
- **Q6.4** Should the ERP push status back (e.g. `production_state`, shipped)? If yes, we add
  `PATCH /api/erp/orders/{id}` writing `production_state` / `piedro_order_id` (column already exists).
- **Q6.5** Minimum fields a-shell actually needs — we can trim the contract to those.
