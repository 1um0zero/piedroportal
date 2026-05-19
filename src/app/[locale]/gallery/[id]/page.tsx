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

async function getSiblings(styleName: string, excludeId: string): Promise<Product[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await sb
    .from('products')
    .select('id,style_name,colour_id,picture_name,color_basic,color_name,closure,new_until')
    .eq('style_name', styleName)
    .eq('active', true)
    .neq('id', excludeId)
    .order('color_name')
  return (data ?? []) as unknown as Product[]
}

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const [product, siblings] = await Promise.all([
    getProduct(id),
    getProduct(id).then((p) => p ? getSiblings(p.style_name, id) : []),
  ])

  if (!product) notFound()

  return <ProductDetail product={product} siblings={siblings} />
}
