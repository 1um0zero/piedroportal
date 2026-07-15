// Derived, list-only summary of an order's additions.
//
// The orders lists (`/orders`, `/admin/orders`) render thousands of rows but only
// need TWO facts about the additions JSONB: whether the order is urgent, and
// whether it carries any filled addition (to show the "+" mark). Shipping the full
// `additions` blob (and the never-rendered `comments`) for every row bloats the RSC
// payload, hydration cost and Supabase egress for nothing.
//
// `slimOrdersForList` mutates each row in place: it computes the two booleans and
// strips the heavy fields before the array crosses to the client.

// Whether an order carries at least one filled addition. Mirrors the sided-field
// storage ({ l, r }) and scalar fields — same logic the list used inline before.
export function hasFilledAdditions(adds: Record<string, unknown> | null | undefined): boolean {
  if (!adds) return false
  for (const v of Object.values(adds)) {
    if (v === null || v === undefined || v === '' || v === false) continue
    if (typeof v === 'object') {
      const sv = v as { l?: unknown; r?: unknown }
      if ((sv.l != null && sv.l !== '' && sv.l !== false) || (sv.r != null && sv.r !== '' && sv.r !== false)) return true
      continue
    }
    return true
  }
  return false
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderRow = Record<string, any>

// Replace the heavy `additions` JSONB (and the unused `comments`) with the two
// derived booleans the list actually needs. Mutates in place.
export function slimOrdersForList(rows: OrderRow[]): void {
  for (const o of rows) {
    o.urgent = o.additions?.urgent === true
    o.has_additions = hasFilledAdditions(o.additions)
    delete o.additions
    delete o.comments
  }
}
