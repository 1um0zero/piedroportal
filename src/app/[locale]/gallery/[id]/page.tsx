import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getUserExclusiveLabels } from '@/lib/user-companies'
import ProductDetail from '@/components/product/ProductDetail'
import type { Product } from '@/types'

const FIELDS = 'id,style_name,colour_id,picture_name,section,closure,type,color_basic,color_name,color_name_i18n,size_first,size_last,size_unit,diabetics,new_until,constructions,info,sibling,exclusive'

async function getProduct(id: string): Promise<Product | null> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await sb.from('products').select(FIELDS).eq('id', id).single()
  return (data as unknown as Product) ?? null
}

/** Labels the current visitor may see exclusive models for (empty for anon). */
async function getVisibleLabels(): Promise<Set<string>> {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Set()
  return new Set(await getUserExclusiveLabels(user.id))
}

function isVisible(p: { exclusive?: string | null }, labels: Set<string>): boolean {
  const ex = (p.exclusive ?? '').trim().toUpperCase()
  return !ex || labels.has(ex)
}

async function getSiblings(product: Product): Promise<Product[]> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const SELECT = 'id,style_name,colour_id,picture_name,color_basic,color_name,color_name_i18n,closure,size_first,size_last,size_unit,new_until,diabetics,exclusive'

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
  if (!product) notFound()

  // Customer-exclusive models 404 for anyone outside the owning company.
  const labels = await getVisibleLabels()
  if (!isVisible(product, labels)) notFound()

  const siblings = (await getSiblings(product)).filter((p) => isVisible(p, labels))

  return <ProductDetail product={product} siblings={siblings} />
}
