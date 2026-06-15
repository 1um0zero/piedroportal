/**
 * Width display.
 *
 * Widths are shown in their BASE notation (S, M, L, adult letter codes, numbers)
 * in ALL locales — client decision 2026-06-11: there is NO localisation of widths
 * (the earlier S,M,L → N,R,W Dutch mapping was wrong and has been removed).
 *
 * The helpers are kept as identity functions so call sites stay stable and a
 * future localisation (if ever) plugs back in here. The S→M→L size ordering of
 * width chips is handled by the callers (e.g. GalleryPage rank), not here.
 */

/** Display one width, disambiguated by construction. (Identity — no translation.) */
export function displayWidthByConstruction(w: string, _construction: string | null | undefined, _locale: string): string {
  return w
}

/** Display a single width given the full set it belongs to. (Identity — no translation.) */
export function displayWidth(w: string, _widths: string[], _locale: string): string {
  return w
}

/** Display a list of widths. (Identity — no translation.) */
export function displayWidths(widths: string[], _locale: string): string[] {
  return widths
}

// ── Width ordering ───────────────────────────────────────────────────────────
// Width lists must read in their natural size sequence, NOT alphabetically
// (client rule: "a sequência S-M-L deve ser respeitada, o mesmo para as outras
// listas com letras"). The canonical order below is derived from the ordered
// `cr56f_widthlist` sequences in the source catalogue workbook
// (docs/All models for the Platform_last version.xlsx) by topologically merging
// every per-construction list so each one stays a subsequence of the result:
//
//   KIDS   → numerics (1½…8½)  then  S, M, L   (N,R,W in the sheet map to S,M,L)
//   ADULTS → numerics (6,8,9)  then  E, EE, G, GG, GH, HK, I, KM, F, H, J, K, M
//
// Numerics always come first (handled by value), then letters by the rank below.
// KIDS and ADULTS letters never co-occur in a real width set, so a single merged
// rank serves both: S sits before the adult letters, M/L stay last for KIDS.
const LETTER_ORDER = ['S', 'E', 'EE', 'G', 'GG', 'GH', 'HK', 'I', 'KM', 'F', 'H', 'J', 'K', 'M', 'L']
const LETTER_RANK: Record<string, number> = Object.fromEntries(LETTER_ORDER.map((w, i) => [w, i]))

function widthNum(s: string): number {
  return parseFloat(s.replace('½', '.5').replace(/(\d)1\/2/, '$1.5'))
}

/** Compare two width codes by their natural size order (numerics first, then the letter scale). */
export function compareWidths(a: string, b: string): number {
  const numA = /^\d/.test(a), numB = /^\d/.test(b)
  if (numA !== numB) return numA ? -1 : 1           // numerics before letters
  if (numA && numB) return widthNum(a) - widthNum(b)
  const rA = LETTER_RANK[a], rB = LETTER_RANK[b]
  if (rA != null && rB != null) return rA - rB       // known letters by catalogue order
  if (rA != null) return -1
  if (rB != null) return 1
  return a.localeCompare(b)                           // unknown codes — stable fallback
}

/** Return a width list sorted in natural size order. */
export function sortWidths(widths: string[]): string[] {
  return [...widths].sort(compareWidths)
}
