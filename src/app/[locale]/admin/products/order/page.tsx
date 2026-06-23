import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireCatalogueWritePage } from '@/lib/admin/scope'
import StyleOrderer, { type StyleItem } from '@/components/admin/StyleOrderer'
import type { Section } from '@/types'

const FIELDS = 'style_name, section, colour_id, picture_name, gallery_position'
const FIELDS_NO_POS = 'style_name, section, colour_id, picture_name'

type Row = {
  style_name: string
  section: Section
  colour_id: string
  picture_name: string | null
  gallery_position: number | null
}

export default async function StyleOrderPage() {
  const scope = await requireCatalogueWritePage()
  const t = await getTranslations('admin.order')

  const service = createServiceClient()
  // Fall back to a column set without gallery_position if migration 014 isn't
  // applied yet, so the page still loads (positions just read as null).
  let fields = FIELDS
  const rows: Row[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    let { data, error } = await service
      .from('products').select(fields).eq('active', true)
      .range(offset, offset + PAGE - 1)
    if (error && fields !== FIELDS_NO_POS) {
      fields = FIELDS_NO_POS
      ;({ data, error } = await service
        .from('products').select(fields).eq('active', true)
        .range(offset, offset + PAGE - 1))
    }
    if (error || !data?.length) break
    rows.push(...(data as unknown as Row[]))
    if (data.length < PAGE) break
    offset += PAGE
  }

  // Reduce colour-variant rows to one entry per style.
  type Acc = StyleItem & { position: number | null; repColour: string }
  const map = new Map<string, Acc>()
  for (const r of rows) {
    if (!scope.allModels && !scope.canModel(r.style_name)) continue
    let a = map.get(r.style_name)
    if (!a) {
      a = { style: r.style_name, section: r.section, count: 0, picture: null, position: null, repColour: '￿' }
      map.set(r.style_name, a)
    }
    a.count++
    // Representative image = lowest colour_id that actually has a picture.
    if (r.picture_name && r.colour_id < a.repColour) { a.picture = r.picture_name; a.repColour = r.colour_id }
    if (a.position === null && r.gallery_position != null) a.position = r.gallery_position
  }

  // Sort by manual position (nulls last), then style_name.
  const styles = [...map.values()].sort((a, b) => {
    if (a.position == null && b.position == null) return a.style.localeCompare(b.style)
    if (a.position == null) return 1
    if (b.position == null) return -1
    return a.position - b.position || a.style.localeCompare(b.style)
  })

  const bySection: Record<Section, StyleItem[]> = { KIDS: [], MEN: [], WOMEN: [] }
  for (const s of styles) {
    bySection[s.section].push({ style: s.style, section: s.section, count: s.count, picture: s.picture })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>
          <p className="text-sm text-stone-500 mt-0.5">{t('subtitle')}</p>
        </div>
        <Link href="/admin/products"
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
          ← {t('back_to_products')}
        </Link>
      </div>
      <StyleOrderer initial={bySection} />
    </div>
  )
}
