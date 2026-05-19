import { createClient } from '@/lib/supabase/server'
import GalleryPage from '@/components/gallery/GalleryPage'
import type { Product } from '@/types'

const FIELDS = [
  'id','style_name','colour_id','picture_name','section',
  'closure','type','color_basic','color_name',
  'size_first','size_last','diabetics','new_until','constructions',
].join(',')

export default async function GalleryRoute() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select(FIELDS)
    .eq('active', true)
    .eq('section', 'KIDS')
    .order('style_name')

  const initialProducts = (data ?? []) as unknown as Product[]

  return <GalleryPage initialSection="KIDS" initialProducts={initialProducts} />
}
