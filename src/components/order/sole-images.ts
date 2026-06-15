/**
 * Sole swatch images — value → public path, from the normalized set in public/soles/
 * (built by scripts/normalize-sole-images.mjs). Section-aware: cup-sole bumper photos
 * are gender-specific (Ladies/Mens), so pu_type images depend on the product section.
 *
 * Returns only the values we currently have photos for; callers fall back to text chips
 * for the rest (many sole photos are still pending from the client).
 */
import manifest from '../../../public/soles/manifest.json'

const M = manifest as Record<string, Record<string, string>>

// Bump when the normalized images are regenerated, so browsers fetch the new ones.
const V = '2'

/** Map of { optionValue: imagePath } for a field, filtered to the product section. */
export function soleImages(fieldKey: string, section?: string | null): Record<string, string> {
  const f = M[fieldKey]
  if (!f) return {}
  const out: Record<string, string> = {}
  for (const [key, path] of Object.entries(f)) {
    const [value, sec] = key.split('::')
    if (sec) { if (section && sec === section) out[value] = `${path}?v=${V}` }  // gender-specific: match section
    else out[value] = `${path}?v=${V}`                                         // generic
  }
  return out
}
