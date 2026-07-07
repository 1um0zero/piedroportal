import { createClient } from '@supabase/supabase-js'
import GalleryPage from '@/components/gallery/GalleryPage'
import type { Product } from '@/types'

// Cache this page on Vercel CDN — rebuild every 5 minutes
export const revalidate = 300

const FIELDS = [
  'id','style_name','colour_id','picture_name','section',
  'closure','type','color_basic','color_name','color_name_i18n',
  'size_first','size_last','size_unit','diabetics','new_until','constructions',
].join(',')
const FIELDS_NO_UNIT = FIELDS.replace(',size_unit', '')

export default async function GalleryRoute() {
  // Use anon key directly (no cookies) so the page can be statically cached
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Manual gallery order first (NULLS LAST → un-ordered styles fall to the end),
  // then style_name and colour_id keep variants of a style together. Degrades
  // gracefully so the public gallery never breaks if a migration isn't applied
  // yet: drop the gallery_position order (014) and/or the size_unit field (015).
  const run = (fields: string) => supabase
    .from('products').select(fields).eq('active', true).eq('section', 'KIDS')
    // Customer-exclusive models are never part of the public (cached) set — they
    // are overlaid client-side for the signed-in user (see GalleryPage).
    .or('exclusive.is.null,exclusive.eq.')

  // Paginated (the catalogue exceeds Supabase's 1000-row cap) while preserving
  // the graceful-degradation chain: null = this field/order variant errored.
  const fetchVariant = async (fields: string, withPosition: boolean) => {
    const rows: unknown[] = []
    for (let from = 0; ; from += 1000) {
      let q = run(fields)
      if (withPosition) q = q.order('gallery_position', { ascending: true, nullsFirst: false })
      const { data, error } = await q.order('style_name').order('colour_id').range(from, from + 999)
      if (error) return from === 0 ? null : rows
      if (!data?.length) break
      rows.push(...data)
      if (data.length < 1000) break
    }
    return rows
  }

  const rows =
    (await fetchVariant(FIELDS, true)) ??
    (await fetchVariant(FIELDS, false)) ??
    (await fetchVariant(FIELDS_NO_UNIT, false)) ??
    []

  const initialProducts = rows as unknown as Product[]

  return <GalleryPage initialSection="KIDS" initialProducts={initialProducts} showHero />
}
