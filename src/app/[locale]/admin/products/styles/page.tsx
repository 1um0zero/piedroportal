import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireBackofficePage } from '@/lib/admin/scope'
import StylesList, { type StyleRow } from '@/components/admin/StylesList'

const MAQUETTE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/maquettes`

export default async function AdminStylesPage() {
  const scope = await requireBackofficePage()
  const service = createServiceClient()

  // All styles (model-level table).
  const styles: { style_name: string; num_colours: number | null; maquette: string | null; maquette_kind: string | null }[] = []
  let off = 0
  for (;;) {
    const { data, error } = await service.from('styles')
      .select('style_name, num_colours, maquette, maquette_kind')
      .order('style_name').range(off, off + 999)
    if (error || !data?.length) break
    styles.push(...data)
    if (data.length < 1000) break
    off += 1000
  }

  // A representative product per style (for section + a sample image), paginated.
  const prod: { style_name: string; section: string | null; colour_id: string; picture_name: string | null }[] = []
  let po = 0
  for (;;) {
    const { data, error } = await service.from('products')
      .select('style_name, section, colour_id, picture_name').order('colour_id').range(po, po + 999)
    if (error || !data?.length) break
    prod.push(...data as typeof prod)
    if (data.length < 1000) break
    po += 1000
  }
  const meta = new Map<string, { section: string | null; sample: string | null; colours: number }>()
  for (const p of prod) {
    const m = meta.get(p.style_name) ?? { section: p.section, sample: p.picture_name, colours: 0 }
    m.colours++
    meta.set(p.style_name, m)
  }

  const rows: StyleRow[] = styles
    .filter(s => scope.allModels || scope.canModel(s.style_name))
    .map(s => ({
      styleName: s.style_name,
      numColours: s.num_colours,
      maquetteUrl: s.maquette ? `${MAQUETTE_BASE}/${s.maquette}` : null,
      section: meta.get(s.style_name)?.section ?? null,
      variantCount: meta.get(s.style_name)?.colours ?? 0,
    }))

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-1 flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-stone-400 hover:text-stone-700">← Products</Link>
      </div>
      <h1 className="mb-1 text-xl font-bold text-stone-900">Styles &amp; maquettes</h1>
      <p className="mb-6 text-sm text-stone-500">
        Model-level data for the CUSTOM leather selector: the number of leather pieces/colours and
        the maquette (JPEG or SVG). One row per style — applies to all its colour variants.
      </p>
      <StylesList rows={rows} />
    </div>
  )
}
