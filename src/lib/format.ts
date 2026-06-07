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
