import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import OrdersPage from '@/components/orders/OrdersPage'

export default async function OrdersRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  const isAdmin   = profile?.role === 'piedro_admin'
  const companyId = profile?.company_id

  // Admins go to the back-office orders view
  if (isAdmin) redirect('/admin/orders')

  // Non-admin without company → pending approval page
  if (!companyId) {
    const t = await getTranslations('auth')
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-stone-800">{t('pending_company')}</h1>
        <p className="text-sm text-stone-500">{t('pending_company_desc')}</p>
      </div>
    )
  }

  // Fetch this company's orders
  const service = createServiceClient()
  const SELECT = `
    id, status, unit, patient_name, reference_customer, quantity,
    created_at, updated_at, size_left, size_right, additions, comments, pdf_url,
    products(id, style_name, colour_id, color_name, closure, picture_name, section),
    companies(id, name, erp_code)
  `

  let allOrders: any[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service
      .from('orders')
      .select(SELECT)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    allOrders = allOrders.concat(data)
    if (data.length < PAGE) break
    offset += PAGE
  }

  const orders = allOrders

  // Metrics
  const all       = orders ?? []
  const metrics   = {
    total:      all.length,
    draft:      all.filter(o => o.status === 'draft').length,
    submitted:  all.filter(o => o.status === 'submitted').length,
    approved:   all.filter(o => o.status === 'approved').length,
    production: all.filter(o => o.status === 'in_production').length,
    urgent:     all.filter(o => (o.additions as any)?.urgent === true).length,
  }

  return (
    <OrdersPage
      orders={all}
      metrics={metrics}
      isAdmin={false}
    />
  )
}
