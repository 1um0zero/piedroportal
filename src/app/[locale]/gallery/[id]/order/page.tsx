import { notFound } from 'next/navigation'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import OrderForm from '@/components/order/OrderForm'
import type { Product } from '@/types'

async function getProduct(id: string): Promise<Product | null> {
  const sb = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await sb
    .from('products')
    .select('id,style_name,colour_id,color_name,closure,picture_name,constructions,size_first,size_last,section,adds_exclude')
    .eq('id', id)
    .single()
  return (data as unknown as Product) ?? null
}

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function OrderPage({ params }: Props) {
  const { id } = await params

  // Middleware already guarantees auth — just read the user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('company_id, full_name, role').eq('id', user.id).single()
    : { data: null }

  const product = await getProduct(id)
  if (!product) notFound()

  return (
    <OrderForm
      product={product}
      userId={user?.id ?? ''}
      userProfile={profile ?? { company_id: null, full_name: null, role: 'user' }}
    />
  )
}
