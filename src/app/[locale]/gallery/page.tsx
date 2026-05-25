import { createClient } from '@supabase/supabase-js'
import GalleryPage from '@/components/gallery/GalleryPage'
import type { Product } from '@/types'

// Cache this page on Vercel CDN — rebuild every 5 minutes
export const revalidate = 300

const FIELDS = [
  'id','style_name','colour_id','picture_name','section',
  'closure','type','color_basic','color_name','color_name_i18n',
  'size_first','size_last','diabetics','new_until','constructions',
].join(',')

export default async function GalleryRoute() {
  // Use anon key directly (no cookies) so the page can be statically cached
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data } = await supabase
    .from('products')
    .select(FIELDS)
    .eq('active', true)
    .eq('section', 'KIDS')
    .order('style_name')

  const initialProducts = (data ?? []) as unknown as Product[]

  return <GalleryPage initialSection="KIDS" initialProducts={initialProducts} />
}
