import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { createServiceClient } from '@/lib/supabase/service'
import TranslationsEditor, { type TransRow, type ShoeRow } from '@/components/admin/TranslationsEditor'

type ProductBits = {
  closure: string | null
  type: string | null
  color_basic: string | null
  color_name: string | null
  color_name_i18n: { nl?: string; fr?: string; de?: string } | null
  constructions: { construction: string }[] | null
}

export default async function AdminTranslationsPage() {
  await requirePiedroAdminPage()
  const service = createServiceClient()

  // Existing UI/filter translations (key → row), incl. the colour-word dictionary.
  const { data: trans } = await service
    .from('translations')
    .select('key, en, nl, fr, de, category')
    .in('category', ['closure', 'type', 'construction', 'colour', 'colour_word'])
  const byKey = new Map((trans ?? []).map(r => [r.key, r]))

  // Manual-override flags (the `manual` column may not exist until the
  // colour-words migration has been run — degrade gracefully if so).
  const manualMap = new Map<string, boolean>()
  const { data: manualRows, error: manualErr } = await service
    .from('translations').select('key, manual').eq('category', 'colour')
  if (!manualErr) for (const r of manualRows ?? []) manualMap.set(r.key, !!r.manual)

  // Colour-word dictionary rows (standalone; key is prefixed "word:<English>").
  const colourWords: TransRow[] = (trans ?? [])
    .filter(r => r.category === 'colour_word')
    .map(r => ({ key: r.key, label: r.en, en: r.en, nl: r.nl ?? '', fr: r.fr ?? '', de: r.de ?? '' }))
    .sort((a, b) => a.en.localeCompare(b.en))

  // Distinct values actually present on products (so the grid also surfaces
  // untranslated values that have no row yet, e.g. AGO / TWIST LOCK SYSTEM).
  const closures = new Set<string>()
  const types = new Set<string>()
  const constructions = new Set<string>()
  const basicColours = new Set<string>()
  const shoeColours = new Map<string, { nl: string; fr: string; de: string }>()

  for (let from = 0; ; from += 1000) {
    const { data, error } = await service
      .from('products')
      .select('closure, type, color_basic, color_name, color_name_i18n, constructions')
      .order('id')
      .range(from, from + 999)
    if (error || !data?.length) break
    for (const p of data as ProductBits[]) {
      if (p.closure) closures.add(p.closure)
      if (p.type) types.add(p.type)
      if (p.color_basic) basicColours.add(p.color_basic)
      for (const c of p.constructions ?? []) if (c?.construction) constructions.add(c.construction)
      if (p.color_name && !shoeColours.has(p.color_name)) {
        const i = p.color_name_i18n ?? {}
        shoeColours.set(p.color_name, { nl: i.nl ?? '', fr: i.fr ?? '', de: i.de ?? '' })
      }
    }
    if (data.length < 1000) break
  }

  const buildRows = (values: Set<string>): TransRow[] =>
    [...values].sort((a, b) => a.localeCompare(b)).map(v => {
      const r = byKey.get(v)
      return { key: v, en: r?.en ?? v, nl: r?.nl ?? '', fr: r?.fr ?? '', de: r?.de ?? '', manual: manualMap.get(v) ?? false }
    })

  const shoeRows: ShoeRow[] = [...shoeColours.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([color_name, i]) => ({ color_name, nl: i.nl, fr: i.fr, de: i.de }))

  return (
    <TranslationsEditor
      construction={buildRows(constructions)}
      closure={buildRows(closures)}
      type={buildRows(types)}
      colour={buildRows(basicColours)}
      colourWords={colourWords}
      shoeColours={shoeRows}
    />
  )
}
