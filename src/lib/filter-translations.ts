import type { Locale } from '@/types'

type FilterCategory = 'closure' | 'type' | 'construction'

/**
 * Client-side cache for filter translations
 * Populated on first fetch to avoid repeated DB queries
 */
const translationCache = new Map<string, Record<Locale, string>>()
let cachePopulated = false

/**
 * Fetches all filter translations from database and populates cache.
 * Uses a raw REST fetch (not the supabase-js client) — same pattern as the
 * gallery — because the SDK client can hang on the session in the browser.
 */
async function populateCache() {
  if (cachePopulated) return

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!base || !key) return

  const url = `${base}/rest/v1/translations`
    + `?select=key,en,nl,fr,de,category`
    + `&category=in.(closure,type,construction,colour)`
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  if (!res.ok) return

  const data = (await res.json()) as { key: string; en: string; nl: string; fr: string; de: string }[]
  for (const row of data) {
    translationCache.set(row.key, { en: row.en, nl: row.nl, fr: row.fr, de: row.de })
  }
  cachePopulated = true
}

/**
 * Translates a filter value (closure, type, or construction) based on locale
 * Uses database translations table, falls back to original value if not found
 */
export async function translateFilterValue(
  category: FilterCategory,
  value: string | null | undefined,
  locale: Locale
): Promise<string> {
  if (!value) return ''

  // Populate cache on first call
  await populateCache()

  // Lookup translation
  const translations = translationCache.get(value)
  if (translations && translations[locale]) {
    return translations[locale]
  }

  // Fallback to original value
  return value
}

/**
 * Synchronous version that returns cached translation or original value
 * Use only after calling populateCache() or translateFilterValue() at least once
 */
export function translateFilterValueSync(
  value: string | null | undefined,
  locale: Locale
): string {
  if (!value) return ''

  const translations = translationCache.get(value)
  if (translations && translations[locale]) {
    return translations[locale]
  }

  return value
}

/**
 * Preloads all filter translations into cache
 * Call this early in the app lifecycle for better performance
 */
export async function preloadFilterTranslations() {
  await populateCache()
}
