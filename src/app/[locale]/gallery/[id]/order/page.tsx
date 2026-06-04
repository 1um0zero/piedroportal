import { notFound } from 'next/navigation'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserCompanies, getUserExclusiveLabels } from '@/lib/user-companies'
import OrderForm from '@/components/order/OrderForm'
import type { Product } from '@/types'

async function getProduct(id: string): Promise<Product | null> {
  const sb = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await sb
    .from('products')
    .select('id,style_name,colour_id,color_name,closure,picture_name,constructions,size_first,size_last,section,adds_exclude,exclusive')
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
    ? await supabase.from('profiles').select('id, email, full_name, role, company_id, preferred_locale').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.role === 'piedro_admin'

  let companies: Company[] = []
  let userCompany: Company | null = null

  if (isAdmin) {
    // Piedro admins see all companies
    const { data } = await supabase.from('companies').select('id,name,erp_code').order('name')
    companies = (data ?? []) as Company[]
  } else if (user) {
    // Regular users and company_admins see only their companies
    const userCompanies = await getUserCompanies(user.id)

    if (userCompanies.length === 1) {
      // Single company → set as userCompany (no dropdown)
      userCompany = {
        id: userCompanies[0].id,
        name: userCompanies[0].name,
        erp_code: userCompanies[0].erp_code,
      }
    } else if (userCompanies.length > 1) {
      // Multiple companies → show dropdown
      companies = userCompanies.map(uc => ({
        id: uc.id,
        name: uc.name,
        erp_code: uc.erp_code,
      }))
    }
  }

  const product = await getProduct(id)
  if (!product) notFound()

  // Customer-exclusive models: only the owning company's users (or piedro_admin) may order.
  const exclusive = ((product as unknown as { exclusive?: string | null }).exclusive ?? '').trim().toUpperCase()
  if (exclusive && !isAdmin) {
    const labels = user ? await getUserExclusiveLabels(user.id) : []
    if (!labels.includes(exclusive)) notFound()
  }

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
      userProfile={profile ?? { id: '', email: '', company_id: null, full_name: null, role: 'user', preferred_locale: 'en' }}
      userCompany={userCompany}
      companies={companies}
      isAdmin={isAdmin}
      draftId={draftId}
      draftData={draftData}
    />
  )
}
