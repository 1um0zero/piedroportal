// ── Reference search matching ──────────────────────────────────────────────
// Shared by every reference/style search box (gallery, products, orders, stock).
//
// `*` is a wildcard. With a `*` the term is anchored, so `2*` = starts with 2,
// `*K` = ends with K, `27*9` = 2…7…9. Without any `*` it stays a plain
// "contains" match (typing `2729` still finds it anywhere in the value).

const REGEX_SPECIALS = /[.+?^${}()|[\]\\]/g

/** Client-side matcher for a single value against a (possibly wildcarded) term. */
export function matchesSearch(value: string | null | undefined, term: string): boolean {
  const t = term.trim().toLowerCase()
  if (!t) return true
  const hay = (value ?? '').toLowerCase()
  if (!t.includes('*')) return hay.includes(t)
  const rx = new RegExp('^' + t.split('*').map((s) => s.replace(REGEX_SPECIALS, '\\$&')).join('.*') + '$')
  return rx.test(hay)
}

/** Client-side matcher across several values — matches if any field matches. */
export function matchesAny(values: Array<string | null | undefined>, term: string): boolean {
  if (!term.trim()) return true
  return values.some((v) => matchesSearch(v, term))
}

/**
 * Translate a (possibly wildcarded) term into a Postgres ILIKE pattern.
 * `*` → `%` (anchored); no `*` → wrapped in `%…%` (contains).
 * User `%` / `_` are escaped so they stay literal.
 */
export function toIlikePattern(term: string): string {
  const t = term.trim()
  const escaped = t.replace(/[%_\\]/g, '\\$&')
  return t.includes('*') ? escaped.replace(/\*/g, '%') : `%${escaped}%`
}
