/**
 * Customer-exclusive model visibility & classification.
 *
 * A product's `exclusive` field holds one or several siglas separated by spaces/
 * commas (e.g. "LIV", "ZSM", or a future "LIV XXX"). Two distinct concepts:
 *
 *  • LIV is a COMPLEMENTARY CLASSIFICATION — it places a model in the Livingstone
 *    section. It is not a customer-exclusivity by itself.
 *  • Every OTHER sigla (ZSM, KIV, MME, …) is a CUSTOMER exclusivity: only that
 *    client's companies (plus back-office) may see the model.
 *
 * So a model's customer exclusivity = its siglas EXCEPT LIV (`clientSiglas`). A
 * model with only "LIV" is a plain Livingstone model; a model with "LIV XXX" is a
 * Livingstone model that is ALSO exclusive to client XXX (hidden from non-XXX).
 */

/** Split an exclusive string into UPPERCASE sigla tokens (deduped). */
export function exclusiveTokens(s: string | null | undefined): string[] {
  if (!s) return []
  return [...new Set(String(s).toUpperCase().match(/[A-Z0-9]+/g) ?? [])]
}

/** Whether a model belongs to the Livingstone section (carries the LIV tag). */
export function isLivingstone(exclusive: string | null | undefined): boolean {
  return exclusiveTokens(exclusive).includes('LIV')
}

/**
 * The CUSTOMER-exclusivity siglas of a model = all siglas except LIV. Empty for a
 * non-exclusive model or a plain Livingstone model. Drives the card dots and the
 * per-sigla filter chips.
 */
export function clientSiglas(exclusive: string | null | undefined): string[] {
  return exclusiveTokens(exclusive).filter((t) => t !== 'LIV')
}

/**
 * Siglas that GATE who may see a model. If it has any customer sigla, those gate
 * it (LIV alone never grants access to a customer-exclusive model). Otherwise the
 * raw tokens gate it (a plain "LIV" model is gated by the LIV grant).
 */
function gatingSiglas(exclusive: string | null | undefined): string[] {
  const cs = clientSiglas(exclusive)
  return cs.length ? cs : exclusiveTokens(exclusive)
}

/** Whether a product (by its raw `exclusive` value) is visible to the user. */
export function isExclusiveVisible(
  productExclusive: string | null | undefined,
  userLabels: Set<string>,
  isAdmin: boolean,
): boolean {
  const gating = gatingSiglas(productExclusive)
  if (gating.length === 0) return true // not exclusive → visible to everyone
  if (isAdmin) return true             // back-office sees all exclusive models
  return gating.some((g) => userLabels.has(g))
}
