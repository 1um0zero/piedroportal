import manifest from './catalogues-manifest.json'

export type CatalogueType = 'kids' | 'adults'

export interface Catalogue {
  slug: string
  type: CatalogueType
  lang: string
  leaves: number
}

const CATALOGUES = manifest.catalogues as Catalogue[]

// Bump when the catalogues are re-rendered (scripts/build-catalogues.mjs) so the
// Vercel optimizer + browsers fetch fresh leaves despite the stable leaf-NNN.jpg
// names (mirrors PRODUCT_IMG_VERSION for the products bucket).
const CATALOGUE_IMG_VERSION = '1'

// Route each leaf through Next's image optimizer instead of serving the raw JPG
// straight from Supabase Storage. The flip-book then loads right-sized WebP from
// Vercel's CDN — ~3× less bytes AND the egress moves off Supabase (each source is
// pulled once, globally, then cached). Catalogues were the dominant Storage
// egress (~97% of total) because loadFromImages() eager-loads the whole ~132-leaf
// book, un-optimized, on every open. w=1080 caps at the 1000px source (no
// upscale, no quality loss); q=75 is the only quality allowed without a
// `qualities` allowlist in Next 16.
function optimized(rawUrl: string): string {
  return `/_next/image?url=${encodeURIComponent(rawUrl)}&w=1080&q=75`
}

/** Optimizer-served leaf URLs for a catalogue (leaf-001.jpg …). */
export function pageUrls(c: Catalogue): string[] {
  return Array.from({ length: c.leaves }, (_, i) => {
    const raw = `${manifest.baseUrl}/${c.slug}/leaf-${String(i + 1).padStart(3, '0')}.jpg?v=${CATALOGUE_IMG_VERSION}`
    return optimized(raw)
  })
}

/**
 * Pick the catalogue for a type in the requested language, falling back to EN
 * (then to whatever exists) so a missing translation never yields a blank book.
 */
export function getCatalogue(type: CatalogueType, lang: string): Catalogue | undefined {
  const ofType = CATALOGUES.filter((c) => c.type === type)
  return ofType.find((c) => c.lang === lang)
    ?? ofType.find((c) => c.lang === 'en')
    ?? ofType[0]
}

export function catalogueTypes(): CatalogueType[] {
  return [...new Set(CATALOGUES.map((c) => c.type))]
}
