/**
 * i18n Database Helpers
 *
 * Functions to fetch translations and addition options from database.
 * Falls back to messages/*.json if DB record doesn't exist.
 *
 * Future: Admin UI will populate these tables for full backoffice editability.
 */

import { createServerClient } from './supabase/server'
import type { Locale, Translation, AdditionOption } from '@/types'

/**
 * Get a single translation by key
 * @param key Translation key (e.g., 'order.customer')
 * @param locale Target locale
 * @returns Translated string, or key if not found
 */
export async function getTranslation(key: string, locale: Locale): Promise<string> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('translations')
    .select('*')
    .eq('key', key)
    .single()

  if (error || !data) {
    console.warn(`Translation not found for key: ${key}`)
    return key // fallback to key itself
  }

  const translation = data as Translation

  // Return locale-specific value, fallback to EN
  if (locale === 'nl' && translation.nl) return translation.nl
  if (locale === 'fr' && translation.fr) return translation.fr
  if (locale === 'de' && translation.de) return translation.de

  return translation.en
}

/**
 * Get all translations for a category
 * @param category Category name (e.g., 'order_form')
 * @param locale Target locale
 * @returns Record<key, translated_value>
 */
export async function getTranslationsByCategory(
  category: string,
  locale: Locale
): Promise<Record<string, string>> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('translations')
    .select('*')
    .eq('category', category)

  if (error || !data) {
    console.warn(`Translations not found for category: ${category}`)
    return {}
  }

  const translations = data as Translation[]
  const result: Record<string, string> = {}

  translations.forEach(t => {
    let value = t.en
    if (locale === 'nl' && t.nl) value = t.nl
    if (locale === 'fr' && t.fr) value = t.fr
    if (locale === 'de' && t.de) value = t.de

    result[t.key] = value
  })

  return result
}

/**
 * Get translated addition options for a category
 * @param category Field category (e.g., 'lining', 'closure_laces')
 * @param locale Target locale
 * @returns Array of translated option values
 */
export async function getAdditionOptions(
  category: string,
  locale: Locale
): Promise<string[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('addition_options')
    .select('*')
    .eq('category', category)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error || !data) {
    console.warn(`Addition options not found for category: ${category}`)
    return []
  }

  const options = data as AdditionOption[]

  return options.map(opt => {
    let value = opt.value
    if (locale === 'nl' && opt.value_nl) value = opt.value_nl
    if (locale === 'fr' && opt.value_fr) value = opt.value_fr
    if (locale === 'de' && opt.value_de) value = opt.value_de

    return value
  })
}

/**
 * Get translated color name for a product
 * @param colorName English color name (base)
 * @param colorNameI18n JSONB with translations
 * @param locale Target locale
 * @returns Translated color name
 */
export function getTranslatedColor(
  colorName: string,
  colorNameI18n: { nl?: string; fr?: string; de?: string } | null,
  locale: Locale
): string {
  if (!colorNameI18n || locale === 'en') return colorName

  if (locale === 'nl' && colorNameI18n.nl) return colorNameI18n.nl
  if (locale === 'fr' && colorNameI18n.fr) return colorNameI18n.fr
  if (locale === 'de' && colorNameI18n.de) return colorNameI18n.de

  return colorName // fallback to EN
}

/**
 * Get effective locale for an order
 * Hierarchy: order.locale → company.default_locale → profile.preferred_locale → 'en'
 */
export async function getOrderLocale(
  orderId: string
): Promise<Locale> {
  const supabase = await createServerClient()

  const { data: order } = await supabase
    .from('orders')
    .select(`
      locale,
      company:companies!inner(default_locale),
      profile:profiles!inner(preferred_locale)
    `)
    .eq('id', orderId)
    .single()

  if (!order) return 'en'

  // Hierarchy check
  if (order.locale) return order.locale as Locale
  if (order.company?.default_locale) return order.company.default_locale as Locale
  if (order.profile?.preferred_locale) return order.profile.preferred_locale as Locale

  return 'en'
}
