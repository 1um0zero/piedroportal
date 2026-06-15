import { notFound } from 'next/navigation'
import { createClient as createPublicClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserCompanies, getUserExclusiveLabels } from '@/lib/user-companies'
import { getBranchAdminCompanies } from '@/lib/branch-admin'
import { isPiedroAdmin } from '@/lib/roles'
import { isExclusiveVisible } from '@/lib/exclusive'
import { getSettings } from '@/lib/settings'
import { closuresAhead } from '@/lib/dispatch'
import OrderForm from '@/components/order/OrderForm'
import type { Product } from '@/types'

async function getProduct(id: string): Promise<Product | null> {
  const sb = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await sb
    .from('products')
    .select('id,style_name,colour_id,color_name,closure,picture_name,constructions,size_first,size_last,size_unit,section,adds_exclude,exclusive')
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

  const isAdmin = isPiedroAdmin(profile?.role)

  let companies: Company[] = []
  let userCompany: Company | null = null

  if (isAdmin) {
    // Piedro admins see all companies
    const { data } = await supabase.from('companies').select('id,name,erp_code').order('name')
    companies = (data ?? []) as Company[]
  } else if (user) {
    // Regular users and company_admins see their own companies. Branch admins
    // additionally see every client linked to the branch office(s) they manage.
    const [userCompanies, branchCompanies] = await Promise.all([
      getUserCompanies(user.id),
      getBranchAdminCompanies(user.id),
    ])
    const byId = new Map<string, Company>()
    for (const c of userCompanies) byId.set(c.id, { id: c.id, name: c.name, erp_code: c.erp_code })
    for (const c of branchCompanies) byId.set(c.id, { id: c.id, name: c.name, erp_code: c.erp_code })
    const merged = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))

    if (merged.length === 1) {
      // Single company → set as userCompany (no dropdown)
      userCompany = merged[0]
    } else if (merged.length > 1) {
      // Multiple companies → show dropdown
      companies = merged
    }
  }

  const product = await getProduct(id)
  if (!product) notFound()

  // Customer-exclusive models: only owning-company users (or piedro_admin) may order.
  // `exclusive` may list several siglas — visible on a token intersection.
  const exclusive = (product as unknown as { exclusive?: string | null }).exclusive
  if (exclusive && !isAdmin) {
    const labels = new Set(user ? await getUserExclusiveLabels(user.id) : [])
    if (!isExclusiveVisible(exclusive, labels, false)) notFound()
  }

  // Load draft data if draftId is provided (duplicate/edit flow).
  // Security: only the order's owner (or a piedro_admin) may load it — never leak
  // another user's/company's order + patient data via a guessed ?draft= id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let draftData: Record<string, any> | null = null
  if (draftId && user) {
    const service = createServiceClient()
    const { data } = await service
      .from('orders')
      .select('user_id,unit,clinician,patient_name,reference_customer,quantity,construction_left,construction_right,width_left,width_right,size_left,size_right,additions,comments,company_id')
      .eq('id', draftId)
      .single()
    if (data && (data.user_id === user.id || isAdmin)) draftData = data
  }

  // Warn the buyer if the factory is closed within the dispatch window (so they
  // know their expected dispatch may be later than usual).
  const dispatchSettings = await getSettings(['dispatch_days_normal', 'dispatch_days_urgent'])
  const windowDays = Math.max(
    parseInt(dispatchSettings.dispatch_days_normal || '0', 10) || 0,
    parseInt(dispatchSettings.dispatch_days_urgent || '0', 10) || 0,
  )
  let upcomingClosures: { date: string; reason: 'holiday' | 'closure' }[] = []
  if (windowDays > 0) {
    const { data: cl } = await createServiceClient().from('factory_closures').select('date')
    const closures = new Set((cl ?? []).map(r => (r as { date: string }).date))
    upcomingClosures = closuresAhead(closures, windowDays)
  }

  return (
    <OrderForm
      product={product}
      closuresAhead={upcomingClosures}
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
