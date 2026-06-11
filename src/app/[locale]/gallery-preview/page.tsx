import { createClient } from '@supabase/supabase-js'
import GalleryPage from '@/components/gallery/GalleryPage'
import type { Product } from '@/types'

// Preview of the revised gallery with the per-section hero banner + transparent
// overlay header. Kept separate from the live /gallery so it can be validated
// before promoting. Same data fetch as the live gallery route.
export const revalidate = 300

const FIELDS = [
  'id','style_name','colour_id','picture_name','section',
  'closure','type','color_basic','color_name','color_name_i18n',
  'size_first','size_last','size_unit','diabetics','new_until','constructions',
].join(',')
const FIELDS_NO_UNIT = FIELDS.replace(',size_unit', '')

export default async function GalleryPreviewRoute() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const run = (fields: string) => supabase
    .from('products').select(fields).eq('active', true).eq('section', 'KIDS')
    .or('exclusive.is.null,exclusive.eq.')

  let res = await run(FIELDS)
    .order('gallery_position', { ascending: true, nullsFirst: false })
    .order('style_name').order('colour_id')
  if (res.error) res = await run(FIELDS).order('style_name').order('colour_id')
  if (res.error) res = await run(FIELDS_NO_UNIT).order('style_name').order('colour_id')

  const initialProducts = (res.data ?? []) as unknown as Product[]

  return <GalleryPage initialSection="KIDS" initialProducts={initialProducts} showHero />
}
