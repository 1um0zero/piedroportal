'use server'

import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { createServiceClient } from '@/lib/supabase/service'
import { composeColour } from '@/lib/colour-compose'

export type TransRow = { key: string; en: string; nl: string; fr: string; de: string; manual?: boolean; label?: string }
export type ShoeColourRow = { color_name: string; nl: string; fr: string; de: string }

const CATEGORIES = new Set(['closure', 'type', 'construction', 'colour', 'colour_word'])

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
      // A hand-edited basic-colour value is locked from auto-composition.
      ...(category === 'colour' ? { manual: true } : {}),
    }))
  if (!payload.length) return { ok: true }

  const service = createServiceClient()
  const { error } = await service.from('translations').upsert(payload, { onConflict: 'key' })
  if (error) return { error: error.message }
  return { ok: true }
}

/**
 * Regenerate every basic-colour (category 'colour') translation by composing it
 * from the colour-word dictionary — except rows marked `manual`, which were
 * hand-edited and are left untouched.
 */
export async function recomposeBasicColours(): Promise<{ updated?: number; missing?: string[]; error?: string }> {
  const auth = await assertAdmin()
  if ('error' in auth) return { error: auth.error }

  const service = createServiceClient()

  // Word dictionary, per locale.
  const { data: words } = await service
    .from('translations').select('en, nl, fr, de').eq('category', 'colour_word')
  const dict = {
    nl: new Map<string, string>(), fr: new Map<string, string>(), de: new Map<string, string>(),
  }
  for (const w of words ?? []) {
    for (const l of ['nl', 'fr', 'de'] as const) {
      const v = clean((w as Record<string, unknown>)[l])
      if (v) dict[l].set(w.en, v)
    }
  }

  // Rows already locked by a manual edit.
  const { data: existing } = await service
    .from('translations').select('key, manual').eq('category', 'colour')
  const manualKeys = new Set((existing ?? []).filter(r => r.manual).map(r => r.key))

  // Distinct basic colours present on products.
  const colours = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await service
      .from('products').select('color_basic').not('color_basic', 'is', null).order('id').range(from, from + 999)
    if (error) return { error: error.message }
    if (!data.length) break
    for (const p of data as { color_basic: string | null }[]) if (p.color_basic) colours.add(p.color_basic)
    if (data.length < 1000) break
  }

  const allMissing = new Set<string>()
  const payload = [...colours]
    .filter(c => !manualKeys.has(c))
    .map(c => {
      const nl = composeColour(c, dict.nl); nl.missing.forEach(m => allMissing.add(m))
      const fr = composeColour(c, dict.fr)
      const de = composeColour(c, dict.de)
      return { key: c, en: c, nl: nl.text || null, fr: fr.text || null, de: de.text || null, category: 'colour', manual: false }
    })

  if (payload.length) {
    for (let i = 0; i < payload.length; i += 200) {
      const { error } = await service.from('translations').upsert(payload.slice(i, i + 200), { onConflict: 'key' })
      if (error) return { error: error.message }
    }
  }
  return { updated: payload.length, missing: [...allMissing] }
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
