import type { AdditionField, AdditionSection } from '@/components/order/additions-config'

/**
 * Gets the translated label for an addition field using next-intl
 * @param t - Translation function already scoped to 'additions' namespace
 */
export function getFieldLabel(field: AdditionField, t: (key: string) => string): string {
  return t(`field_labels.${field.key}`)
}

/**
 * Gets the translated label for an addition section using next-intl
 * @param t - Translation function already scoped to 'additions' namespace
 */
export function getSectionLabel(section: AdditionSection, t: (key: string) => string): string {
  return t(`sections.${section.key}`)
}

/**
 * Groups an image-type row (e.g. the rocker diagram) with the conditional child
 * rows that immediately follow it, so the diagram and its measurements can be
 * rendered together. Used by both the confirmation summary and the PDF.
 * A row is an image parent when it carries `imgL`/`imgR`; children are the
 * following rows whose label contains the child marker `·` (and aren't parents).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function groupImageBlocks(filled: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = []
  for (let i = 0; i < filled.length; i++) {
    const f = filled[i]
    if (f.imgL || f.imgR) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const children: any[] = []
      let j = i + 1
      while (j < filled.length && filled[j].label.includes('·') && !filled[j].isParent) {
        children.push(filled[j]); j++
      }
      out.push({ ...f, children })
      i = j - 1
    } else {
      out.push(f)
    }
  }
  return out
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
