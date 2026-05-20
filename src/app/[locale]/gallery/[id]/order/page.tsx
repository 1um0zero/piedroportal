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

type Company = { id: string; name: string; erp_code: string }
type Props   = { params: Promise<{ locale: string; id: string }> }

export default async function OrderPage({ params }: Props) {
  const { id } = await params

  const supabase  = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('company_id, full_name, role').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.role === 'piedro_admin'

  // Admin sees all companies; regular user sees their own
  let companies: Company[] = []
  let userCompany: Company | null = null

  if (isAdmin) {
    const { data } = await supabase.from('companies').select('id,name,erp_code').order('name')
    companies = (data ?? []) as Company[]
  } else if (profile?.company_id) {
    const { data } = await supabase
      .from('companies').select('id,name,erp_code').eq('id', profile.company_id).single()
    userCompany = data as Company | null
  }

  const product = await getProduct(id)
  if (!product) notFound()

  return (
    <OrderForm
      product={product}
      userId={user?.id ?? ''}
      userProfile={profile ?? { company_id: null, full_name: null, role: 'user' }}
      userCompany={userCompany}
      companies={companies}
      isAdmin={isAdmin}
    />
  )
}
