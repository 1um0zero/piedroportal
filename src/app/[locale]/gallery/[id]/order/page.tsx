import { notFound } from 'next/navigation'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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
type Props   = {
  params:       Promise<{ locale: string; id: string }>
  searchParams: Promise<{ draft?: string }>
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params
  const { draft: draftId } = await searchParams

  const supabase  = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('company_id, full_name, role').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.role === 'piedro_admin'

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

  // Load draft data if draftId is provided (duplicate/edit flow)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let draftData: Record<string, any> | null = null
  if (draftId) {
    const service = createServiceClient()
    const { data } = await service
      .from('orders')
      .select('unit,clinician,patient_name,reference_customer,quantity,construction_left,construction_right,width_left,width_right,size_left,size_right,additions,comments,company_id')
      .eq('id', draftId)
      .single()
    draftData = data
  }

  return (
    <OrderForm
      product={product}
      userId={user?.id ?? ''}
      userProfile={profile ?? { company_id: null, full_name: null, role: 'user' }}
      userCompany={userCompany}
      companies={companies}
      isAdmin={isAdmin}
      draftId={draftId}
      draftData={draftData}
    />
  )
}
