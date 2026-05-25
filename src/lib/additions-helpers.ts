import type { AdditionField, AdditionSection } from '@/components/order/additions-config'

/**
 * Gets the translated label for an addition field using next-intl
 */
export function getFieldLabel(field: AdditionField, t: (key: string) => string): string {
  return t(`additions.field_labels.${field.key}`)
}

/**
 * Gets the translated label for an addition section using next-intl
 */
export function getSectionLabel(section: AdditionSection, t: (key: string) => string): string {
  return t(`additions.sections.${section.key}`)
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
