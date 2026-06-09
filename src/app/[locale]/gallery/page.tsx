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

  let res = await run(FIELDS)
    .order('gallery_position', { ascending: true, nullsFirst: false })
    .order('style_name').order('colour_id')
  if (res.error) res = await run(FIELDS).order('style_name').order('colour_id')
  if (res.error) res = await run(FIELDS_NO_UNIT).order('style_name').order('colour_id')

  const initialProducts = (res.data ?? []) as unknown as Product[]

  return <GalleryPage initialSection="KIDS" initialProducts={initialProducts} />
}
