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
