'use server'

import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { createServiceClient } from '@/lib/supabase/service'

export type TransRow = { key: string; en: string; nl: string; fr: string; de: string }
export type ShoeColourRow = { color_name: string; nl: string; fr: string; de: string }

const CATEGORIES = new Set(['closure', 'type', 'construction', 'colour'])

async function assertAdmin(): Promise<{ ok: true } | { error: string }> {
  const scope = await getAdminScope()
  if (!scope || !isPiedroAdmin(scope.role)) return { error: 'Not authorized' }
  return { ok: true }
}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/**
 * Upsert filter-value translations (construction / closure / type / colour).
 * `key` is the canonical English value as stored on products; `en` is the
 * display label (may differ, e.g. key "Shoes" → en "Shoe").
 */
export async function saveTranslationRows(
  category: string,
  rows: TransRow[],
): Promise<{ ok?: boolean; error?: string }> {
  const auth = await assertAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!CATEGORIES.has(category)) return { error: 'Invalid category' }

  const payload = rows
    .filter(r => clean(r.key))
    .map(r => ({
      key: clean(r.key),
      en: clean(r.en) || clean(r.key),
      nl: clean(r.nl) || null,
      fr: clean(r.fr) || null,
      de: clean(r.de) || null,
      category,
    }))
  if (!payload.length) return { ok: true }

  const service = createServiceClient()
  const { error } = await service.from('translations').upsert(payload, { onConflict: 'key' })
  if (error) return { error: error.message }
  return { ok: true }
}

/**
 * Update per-shoe colour translations. These live in products.color_name_i18n
 * (one distinct color_name shared across many products), so we write to every
 * product row sharing that color_name.
 */
export async function saveShoeColours(
  rows: ShoeColourRow[],
): Promise<{ ok?: boolean; error?: string }> {
  const auth = await assertAdmin()
  if ('error' in auth) return { error: auth.error }

  const service = createServiceClient()
  for (const r of rows) {
    const name = clean(r.color_name)
    if (!name) continue
    const i18n = { nl: clean(r.nl), fr: clean(r.fr), de: clean(r.de) }
    const { error } = await service
      .from('products')
      .update({ color_name_i18n: i18n })
      .eq('color_name', name)
    if (error) return { error: error.message }
  }
  return { ok: true }
}
