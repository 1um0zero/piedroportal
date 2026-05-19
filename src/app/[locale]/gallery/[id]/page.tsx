import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ProductDetail from '@/components/product/ProductDetail'
import type { Product } from '@/types'

const FIELDS = 'id,style_name,colour_id,picture_name,section,closure,type,color_basic,color_name,size_first,size_last,diabetics,new_until,constructions,info,sibling'

async function getProduct(id: string): Promise<Product | null> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await sb.from('products').select(FIELDS).eq('id', id).single()
  return (data as unknown as Product) ?? null
}

async function getSiblings(product: Product): Promise<Product[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const SELECT = 'id,style_name,colour_id,picture_name,color_basic,color_name,closure,size_first,size_last,new_until,diabetics'

  // Fetch same style_name
  const { data: same } = await sb
    .from('products')
    .select(SELECT)
    .eq('style_name', product.style_name)
    .eq('active', true)
    .neq('id', product.id)
    .order('color_name')

  // If product has a sibling style (e.g. "5305" ↔ "5305K"), fetch those too
  let linked: Product[] = []
  if (product.sibling) {
    const { data } = await sb
      .from('products')
      .select(SELECT)
      .eq('style_name', product.sibling)
      .eq('active', true)
      .order('color_name')
    linked = (data ?? []) as unknown as Product[]
  }

  const all = [...(same ?? []), ...linked] as unknown as Product[]
  // Deduplicate by id
  return [...new Map(all.map((p) => [p.id, p])).values()]
}

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)
  const siblings = product ? await getSiblings(product) : []

  if (!product) notFound()

  return <ProductDetail product={product} siblings={siblings} />
}
