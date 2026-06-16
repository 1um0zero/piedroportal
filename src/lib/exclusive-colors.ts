/**
 * Pastel colour per exclusive sigla — used for the admin/branch card dots and
 * the matching filter chips, so a model's collection is recognisable at a glance.
 * Clients always see a single gold dot (their own exclusives), never these.
 *
 * Unknown siglas fall back to a neutral stone so a newly-added collection still
 * renders a (consistent) dot until it gets its own colour here.
 */
export const SIGLA_COLOR: Record<string, string> = {
  LIV: '#B8975A', // gold — Livingstone (house collection)
  KIV: '#7FB5B5', // teal
  ZSM: '#C58FB0', // mauve
  MME: '#8FA8C5', // periwinkle
  TUR: '#D8A26A', // amber
  SS:  '#9CB86F', // sage
  SAH: '#C98F8F', // rose
  MTS: '#A89BC9', // lavender
}

const FALLBACK = '#A8A29E' // stone-400

export function siglaColor(sigla: string): string {
  return SIGLA_COLOR[sigla.toUpperCase()] ?? FALLBACK
}

/** Gold dot for client-facing exclusive markers (their own models). */
export const CLIENT_DOT_COLOR = '#B8975A'
