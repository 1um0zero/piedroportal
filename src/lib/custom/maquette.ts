// Resolve a model's maquette drawing — the vector line-art (leather pieces
// numbered ①②③…) uploaded to the public `maquettes` bucket by
// scripts/build-maquettes.mjs. The maquette filename IS the style number, so a
// product resolves its drawing straight from `style_name`.
//
// The manifest lists the styles that actually have a drawing, so the form only
// offers the leather-by-piece picker when one exists (no broken-image flashes).

import manifest from '@/lib/maquettes-manifest.json'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const MAQUETTE_STYLES = new Set(manifest as string[])

export function hasMaquette(styleName?: string | null): boolean {
  return !!styleName && MAQUETTE_STYLES.has(styleName)
}

export function maquetteUrl(styleName?: string | null): string | null {
  if (!hasMaquette(styleName)) return null
  return `${SUPABASE_URL}/storage/v1/object/public/maquettes/${styleName}.svg`
}
