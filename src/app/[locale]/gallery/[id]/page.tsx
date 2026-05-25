import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import ProductDetail from '@/components/product/ProductDetail'
import type { Product } from '@/types'

const FIELDS = 'id,style_name,colour_id,picture_name,section,closure,type,color_basic,color_name,color_name_i18n,size_first,size_last,diabetics,new_until,constructions,info,sibling'

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
  const SELECT = 'id,style_name,colour_id,picture_name,color_basic,color_name,color_name_i18n,closure,size_first,size_last,new_until,diabetics'

  // Fetch same style_name
  const { data: same } = await sb
    .from('products')
    .select(SELECT)
    .eq('style_name', product.style_name)
    .eq('active', true)
    .neq('id', product.id)
    .order('color_name')

  // Sibling style lookup: use the stored field, or infer by K-suffix if missing
  const siblingStyle = product.sibling
    ?? (product.style_name.endsWith('K')
        ? product.style_name.slice(0, -1)      // 1700K → 1700
        : `${product.style_name}K`)             // 1700  → 1700K

  let linked: Product[] = []
  if (siblingStyle !== product.style_name) {
    const { data } = await sb
      .from('products')
      .select(SELECT)
      .eq('style_name', siblingStyle)
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
