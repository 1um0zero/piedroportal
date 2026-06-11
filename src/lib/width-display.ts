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
