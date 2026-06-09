/**
 * Width display translation.
 *
 * Widths are stored in their BASE notation. The only width set with a localised
 * form today is S,M,L → (NL) N,R,W. We must NOT translate globally because "M"
 * is overloaded: it's "Medium" in the S,M,L system but also a letter-code width
 * in the adult system (E,G,I,K,M). So we only translate when the surrounding set
 * is the S,M,L family — detected by the presence of "S" or "L", which the adult
 * letter codes never contain. Unknown locales / sets fall back to the base.
 */

const WIDTH_I18N: Record<string, Record<string, string>> = {
  nl: { S: 'N', M: 'R', L: 'W' },
  // fr/de: no localised form supplied → base notation (S,M,L)
}

const isSmlFamily = (widths: string[]) => widths.some((w) => w === 'S' || w === 'L')

// The S,M,L width system is used only by the AFO/AGO constructions; everything
// else (numeric, adult letter codes E,G,I,K,M…) is not. So when we only have a
// single width value (an order line, the PDF) we can disambiguate the otherwise
// shared "M" by the construction.
const SML_CONSTRUCTIONS = new Set(['AFO', 'AGO'])

/** Translate one width, disambiguating S,M,L by the construction it belongs to. */
export function displayWidthByConstruction(w: string, construction: string | null | undefined, locale: string): string {
  const map = WIDTH_I18N[locale]
  if (!map || !construction || !SML_CONSTRUCTIONS.has(construction)) return w
  return map[w] ?? w
}

/** Translate a single width for display, given the full set it belongs to. */
export function displayWidth(w: string, widths: string[], locale: string): string {
  const map = WIDTH_I18N[locale]
  if (!map || !isSmlFamily(widths)) return w
  return map[w] ?? w
}

/** Translate a list of widths for display. */
export function displayWidths(widths: string[], locale: string): string[] {
  const map = WIDTH_I18N[locale]
  if (!map || !isSmlFamily(widths)) return widths
  return widths.map((w) => map[w] ?? w)
}
