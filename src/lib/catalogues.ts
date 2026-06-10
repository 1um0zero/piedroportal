import manifest from './catalogues-manifest.json'

export type CatalogueType = 'kids' | 'adults'

export interface Catalogue {
  slug: string
  type: CatalogueType
  lang: string
  leaves: number
}

const CATALOGUES = manifest.catalogues as Catalogue[]

/** Absolute, CDN-served leaf URLs for a catalogue (leaf-001.jpg …). */
export function pageUrls(c: Catalogue): string[] {
  return Array.from({ length: c.leaves }, (_, i) =>
    `${manifest.baseUrl}/${c.slug}/leaf-${String(i + 1).padStart(3, '0')}.jpg`)
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
