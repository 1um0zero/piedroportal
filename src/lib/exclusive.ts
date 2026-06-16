/**
 * Customer-exclusive model visibility.
 *
 * A product's `exclusive` field may hold one or several siglas separated by
 * spaces/commas (e.g. "LIV KIV"). A user's exclusivities are the union of the
 * siglas of every company they belong to (see getUserExclusiveLabels). A model
 * is visible when it is not exclusive, the user is a piedro_admin (sees all), or
 * the two token sets intersect.
 */

/** Split an exclusive string into UPPERCASE sigla tokens (deduped). */
export function exclusiveTokens(s: string | null | undefined): string[] {
  if (!s) return []
  return [...new Set(String(s).toUpperCase().match(/[A-Z0-9]+/g) ?? [])]
}

/**
 * Whether a product belongs to the Livingstone collection. The `exclusive` field
 * carries several siglas and `LIV` is NOT exclusive to Livingstone — the `KIV`
 * collection is tagged `"LIV KIV"`. So a model is Livingstone only when it has
 * the LIV token WITHOUT KIV (the genuine "LIV"-only models, currently MEN).
 */
export function isLivingstone(exclusive: string | null | undefined): boolean {
  const tokens = exclusiveTokens(exclusive)
  return tokens.includes('LIV') && !tokens.includes('KIV')
}

/** Whether a product (by its raw `exclusive` value) is visible to the user. */
export function isExclusiveVisible(
  productExclusive: string | null | undefined,
  userLabels: Set<string>,
  isAdmin: boolean,
): boolean {
  const tokens = exclusiveTokens(productExclusive)
  if (tokens.length === 0) return true // not exclusive → visible to everyone
  if (isAdmin) return true             // back-office sees all exclusive models
  return tokens.some((t) => userLabels.has(t))
}
