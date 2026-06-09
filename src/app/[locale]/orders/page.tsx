import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasAnyCompany, getAdminCompanyIds } from '@/lib/user-companies'
import { signOrderPdfs } from '@/lib/order-pdf'
import { attachOrderExtras } from '@/lib/order-tracking'
import { getSettings } from '@/lib/settings'
import { isPiedroAdmin as isPiedroAdminRole } from '@/lib/roles'
import OrdersPage from '@/components/orders/OrdersPage'

const AGE_MONTHS: Record<string, number> = { '3m': 3, '6m': 6, '12m': 12 }
function ageCutoff(age: string): string | null {
  const months = AGE_MONTHS[age]
  if (!months) return null // 'all'
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString()
}

type Props = { searchParams: Promise<{ age?: string; from?: string; to?: string }> }

export default async function OrdersRoute({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Users see all their orders by default; the age/period window is optional.
  const sp = await searchParams
  const age = sp.age ?? 'all'
  const useRange = !!(sp.from && sp.to)
  const cutoff = useRange ? null : ageCutoff(age)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isPiedroAdmin = isPiedroAdminRole(profile?.role)

  // Piedro admins go to the back-office orders view
  if (isPiedroAdmin) redirect('/admin/orders')

  // Check if user has any company associated (via user_companies table)
  const userHasCompany = await hasAnyCompany(user.id)
  if (!userHasCompany) {
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

  // Get companies where user is admin (empty array if not admin of any)
  const adminCompanyIds = await getAdminCompanyIds(user.id)
  const isCompanyAdmin = adminCompanyIds.length > 0

  // Fetch orders: company_admin sees all orders from their admin companies, regular user sees only their own
  const service = createServiceClient()
  const SELECT = `
    id, user_id, dataverse_id, status, approval_state, production_state, unit, patient_name, reference_customer, quantity,
    created_at, updated_at, size_left, size_right, additions, comments, pdf_url,
    products(id, style_name, colour_id, color_name, closure, picture_name, section),
    companies(id, name, erp_code)
  `

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allOrders: any[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    let query = service
      .from('orders')
      .select(SELECT)

    // Company admins see all orders from companies they admin
    if (isCompanyAdmin) {
      query = query.in('company_id', adminCompanyIds)
    } else {
      // Regular users only see their own orders
      query = query.eq('user_id', user.id)
    }

    if (useRange) query = query.gte('created_at', `${sp.from}T00:00:00`).lte('created_at', `${sp.to}T23:59:59`)
    else if (cutoff) query = query.gte('created_at', cutoff)

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)

    if (error || !data?.length) break
    allOrders = allOrders.concat(data)
    if (data.length < PAGE) break
    offset += PAGE
  }

  const orders = allOrders
  await attachOrderExtras(orders, service)
  // Users see the dispatch counter only if Piedro turned it on for everyone.
  const showDispatch = (await getSettings(['dispatch_show_all'])).dispatch_show_all === '1'

  // Replace the stored path with a short-lived signed URL (private bucket).
  const signed = await signOrderPdfs(orders.filter(o => o.pdf_url).map(o => o.id))
  orders.forEach(o => { o.pdf_url = o.pdf_url ? (signed[o.id] ?? null) : null })

  const all = orders ?? []

  return (
    <OrdersPage
      orders={all}
      isAdmin={false}
      currentUserId={user.id}
      age={age}
      from={sp.from}
      to={sp.to}
      showDispatch={showDispatch}
    />
  )
}
