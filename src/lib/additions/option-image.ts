// Resolve an addition-option image path to a displayable URL.
//
// `addition_field_options.image_path` can hold two shapes while the legacy static
// assets and the new editable bucket coexist:
//   - a public asset path, e.g. '/soles/rubber-sole-fish-amber.png' (seeded from
//     public/soles/manifest.json) — returned as-is;
//   - an object name in the public `additions` bucket, e.g. 'runner_sole/<id>.png'
//     (uploaded via the back-office) — resolved to the public object URL.
//
// Bump ADDITIONS_IMG_VERSION after any bulk re-processing of bucket images to
// bust the CDN/browser cache (object names are stable, like product images).

export const ADDITIONS_BUCKET = 'additions'
export const ADDITIONS_IMG_VERSION = '1'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export function additionOptionImageUrl(path?: string | null): string | null {
  if (!path) return null
  // Absolute URL or public asset path → use directly.
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) return path
  // Otherwise it is an object name in the `additions` bucket.
  return `${SUPABASE_URL}/storage/v1/object/public/${ADDITIONS_BUCKET}/${path}?v=${ADDITIONS_IMG_VERSION}`
}
