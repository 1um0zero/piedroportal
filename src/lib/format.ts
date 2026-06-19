/**
 * Canonical display helpers for the whole portal.
 *
 * RULE (portal-wide): a numeric **zero** is always shown as an em-dash "—",
 * never as "0". This makes lists and stat columns far easier to scan, because
 * only the cells that actually carry a value draw the eye. Applies to counts
 * and aggregates in tables, dashboards and cards. (It does NOT apply to data
 * entry inputs, where 0 is a legitimate value.)
 */

export const DASH = '—'

/**
 * Numeric display with the zero→dash rule. `null`/`undefined`/`NaN`/`0` all
 * render as the em-dash; any other number is returned as a string, optionally
 * locale-formatted with thousands separators when a `locale` is passed.
 */
export function nz(value: number | null | undefined, locale?: string): string {
  if (value == null || Number.isNaN(value) || value === 0) return DASH
  return locale ? value.toLocaleString(locale) : String(value)
}

/**
 * The visible, human-readable order number — the portal's restored version of the
 * legacy Dataverse "NNNN" sequence (stored in orders.order_seq). We keep it as a
 * plain integer in the DB (the date is NOT stored — it was what made the legacy ID
 * so wide) and only zero-pad to 4 digits for display, matching the legacy look
 * (e.g. 124 → "0124"). Numbers that outgrow 4 digits print in full. A null seq
 * (unnumbered draft) returns the dash.
 */
export function orderNumber(seq: number | null | undefined): string {
  if (seq == null) return DASH
  return String(seq).padStart(4, '0')
}

/**
 * The legacy long form "YYYY-MM-DD-NNNN", composed on demand from the order's
 * creation date + its sequence. Use only where the old format is explicitly
 * wanted; elsewhere prefer the bare orderNumber().
 */
export function orderNumberFull(seq: number | null | undefined, createdAt: string | null | undefined): string {
  if (seq == null) return DASH
  const datePart = createdAt ? createdAt.slice(0, 10) : ''
  return datePart ? `${datePart}-${orderNumber(seq)}` : orderNumber(seq)
}
