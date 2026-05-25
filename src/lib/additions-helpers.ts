import type { Locale } from '@/types'
import type { AdditionField, AdditionSection } from '@/components/order/additions-config'

/**
 * Gets the translated label for an addition field based on locale
 */
export function getFieldLabel(field: AdditionField, locale: Locale): string {
  if (locale === 'nl' && field.labelNl) return field.labelNl
  if (locale === 'fr' && field.labelFr) return field.labelFr
  if (locale === 'de' && field.labelDe) return field.labelDe
  return field.label
}

/**
 * Gets the translated label for an addition section based on locale
 */
export function getSectionLabel(section: AdditionSection, locale: Locale): string {
  if (locale === 'nl' && section.labelNl) return section.labelNl
  if (locale === 'fr' && section.labelFr) return section.labelFr
  if (locale === 'de' && section.labelDe) return section.labelDe
  return section.label
}

/**
 * Translates an option value using the translations from next-intl
 * Maps English values to translation keys in additions.options
 */
export function translateOptionValue(
  fieldKey: string,
  value: string,
  t: (key: string) => string
): string {
  // Map of field keys to their option categories
  const categoryMap: Record<string, string> = {
    'lining': 'lining',
    'cl_laces': 'closure_laces',
    'cl_velcro': 'closure_velcro',
    'stiff_hard': 'stiffener',
    'toe_puffs': 'toe_puffs',
    'zipper': 'zipper',
    'rocker': 'rocker',
    'bumper': 'bumper',
  }

  const category = categoryMap[fieldKey]
  if (!category) return value

  // Normalize value to translation key (lowercase, replace spaces/special chars)
  const normalizeKey = (v: string): string =>
    v.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[&-]/g, '_')
      .replace(/__+/g, '_')
      .replace(/^_|_$/g, '')

  const key = normalizeKey(value)
  const translationKey = `options.${category}.${key}`
  const translated = t(translationKey)

  // If translation key not found, return original
  return translated === translationKey ? value : translated
}
