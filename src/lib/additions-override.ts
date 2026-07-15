/**
 * Piedro additions override layer.
 *
 * The client's submitted `additions` are immutable. When Piedro staff transcribe
 * an amendment from the order comment into the structured form, the change is
 * stored SEPARATELY as a sparse patch (`additions_override`) — only the fields
 * they touched. This module is the single source of truth for how that patch is
 * built and how it merges over the client additions for the VSI export.
 *
 * Shared by server (ERP contract, server action) and client (staff editor), so
 * it must stay free of server-only imports.
 */

type Additions = Record<string, unknown>

/** A field is "empty" (no value) — same rule the form and explode use. */
function isEmptyVal(v: unknown): boolean {
  if (v == null || v === '' || v === false) return true
  // Sided field { l, r }: empty only when BOTH sides are empty.
  if (typeof v === 'object') {
    const sv = v as { l?: unknown; r?: unknown }
    if ('l' in sv || 'r' in sv) return isEmptyVal(sv.l) && isEmptyVal(sv.r)
  }
  return false
}

/** Deep value-equality by JSON shape (additions values are plain JSON). */
function sameVal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

/**
 * Effective additions for the VSI export / staff view: the client additions with
 * the Piedro override merged over them (override wins per field). Never mutates
 * its inputs. `comments` is not part of additions, so it is never affected.
 */
export function effectiveAdditions(
  additions: Additions | null | undefined,
  override: Additions | null | undefined,
): Additions | null {
  if (!override || typeof override !== 'object' || Object.keys(override).length === 0) {
    return additions ?? null
  }
  return { ...(additions ?? {}), ...override }
}

/** True when the override actually carries at least one field. */
export function hasOverride(override: Additions | null | undefined): boolean {
  return !!override && typeof override === 'object' && Object.keys(override).length > 0
}

/**
 * Sparse patch = only the fields whose value the staff edit changed vs the
 * client's original additions. `comments` is always excluded (it is a top-level
 * column, edited elsewhere). An empty patch means "no override".
 */
export function computeOverridePatch(
  original: Additions | null | undefined,
  edited: Additions | null | undefined,
): Additions {
  const base = original ?? {}
  const next = edited ?? {}
  const patch: Additions = {}
  for (const key of Object.keys(next)) {
    if (key === 'comments') continue
    // Both empty → no change. Critical for OLD orders: the editor seeds every
    // field (incl. config fields added AFTER the order) via emptyAdditions, so a
    // new field is `{l:null,r:null}` in `edited` but `undefined` in the original —
    // that must NOT count as an adjustment.
    if (isEmptyVal(next[key]) && isEmptyVal(base[key])) continue
    if (!sameVal(next[key], base[key])) patch[key] = next[key]
  }
  return patch
}

export type OverrideChange = {
  key: string
  /** contradiction = the client had already chosen a (different) non-empty value. */
  contradiction: boolean
}

/**
 * Classify each patched field: a "fill" (client left it empty) vs a
 * "contradiction" (client had a non-empty value that the override changes). The
 * staff UI warns + requires confirmation for contradictions.
 */
export function classifyOverride(
  original: Additions | null | undefined,
  patch: Additions | null | undefined,
): OverrideChange[] {
  const base = original ?? {}
  const p = patch ?? {}
  return Object.keys(p).map(key => ({
    key,
    contradiction: !isEmptyVal(base[key]) && !sameVal(base[key], p[key]),
  }))
}
