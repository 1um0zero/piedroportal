import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasAnyCompany, getAdminCompanyIds } from '@/lib/user-companies'
import { getBranchAdminCompanyIds } from '@/lib/branch-admin'
import { signOrderPdfs } from '@/lib/order-pdf'
import { slimOrdersForList } from '@/lib/orders/list-summary'
import { getSettings } from '@/lib/settings'
import { isPiedroAdmin as isPiedroAdminRole, isStaffViewer } from '@/lib/roles'
import { getStockOrderRows } from '@/app/actions/stock'
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

  // Piedro admins and global viewers (VSI staff) go to the back-office orders view.
  if (isPiedroAdmin || isStaffViewer(profile?.role)) redirect('/admin/orders')

  // Companies the user may see orders for as a branch admin (clients of the
  // branch office(s) they manage). A branch admin without a personal company is
  // NOT "pending approval" — they reach the list through these.
  const branchAdminCompanyIds = await getBranchAdminCompanyIds(user.id)

  // Check if user has any company associated (via user_companies table)
  const userHasCompany = await hasAnyCompany(user.id)
  if (!userHasCompany && branchAdminCompanyIds.length === 0) {
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

  // Get companies where user is admin (empty array if not admin of any), merged
  // with the branch-admin client companies. Any of these widens the view from
  // "own orders only" to "all orders of these companies".
  const adminCompanyIds = await getAdminCompanyIds(user.id)
  const scopedCompanyIds = [...new Set([...adminCompanyIds, ...branchAdminCompanyIds])]
  const isCompanyAdmin = scopedCompanyIds.length > 0

  // Fetch orders: company_admin sees all orders from their admin companies, regular user sees only their own
  const service = createServiceClient()
  // Tracking + dispatch columns are selected inline (previously fetched in
  // separate sequential per-column round-trips via attachOrderExtras). `comments`
  // is dropped (never rendered) and `additions` is slimmed to two derived
  // booleans. See src/lib/orders/list-summary.ts.
  const SELECT = `
    id, user_id, dataverse_id, order_seq, status, approval_state, production_state, piedro_order_id, unit, patient_name, clinician, reference_customer, quantity,
    created_at, updated_at, size_left, size_right, additions, pdf_url,
    tracking_link, tracking_code, expected_dispatch_date,
    products(id, style_name, colour_id, color_name, closure, picture_name, section),
    companies(id, name, erp_code)
  `

  async function fetchAllOrders() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: any[] = []
    let offset = 0
    const PAGE = 1000
    while (true) {
      let query = service
        .from('orders')
        .select(SELECT)

      // Company admins / branch admins see all orders from their scoped companies
      if (isCompanyAdmin) {
        query = query.in('company_id', scopedCompanyIds)
      } else {
        // Regular users only see their own orders
        query = query.eq('user_id', user!.id)
      }

      if (useRange) query = query.gte('created_at', `${sp.from}T00:00:00`).lte('created_at', `${sp.to}T23:59:59`)
      else if (cutoff) query = query.gte('created_at', cutoff)

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE - 1)

      if (error || !data?.length) break
      rows = rows.concat(data)
      if (data.length < PAGE) break
      offset += PAGE
    }
    return rows
  }

  // The orders fetch, the (independent) stock-orders fetch and the dispatch
  // setting all run in parallel — none depends on the others' result.
  const [allOrders, stockRows, dispatchSetting] = await Promise.all([
    fetchAllOrders(),
    // Merge in STOCK orders (separate table) for the unified list.
    getStockOrderRows({
      userId: isCompanyAdmin ? undefined : user.id,
      companyIds: isCompanyAdmin ? scopedCompanyIds : undefined,
      fromISO: useRange ? `${sp.from}T00:00:00` : undefined,
      toISO: useRange ? `${sp.to}T23:59:59` : undefined,
      cutoffISO: cutoff,
    }),
    // Users see the dispatch counter only if Piedro turned it on for everyone.
    getSettings(['dispatch_show_all']),
  ])

  // Drafts are private to their creator: a company/branch admin viewing the whole
  // company must NOT see colleagues' drafts (their own still show). Regular users
  // only fetch their own orders, so this is a no-op for them.
  // See project_draft_on_behalf_future.
  const orders = [...allOrders, ...stockRows]
    .filter(o => o.status !== 'draft' || o.user_id === user.id)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  const showDispatch = dispatchSetting.dispatch_show_all === '1'

  // Slim the heavy additions JSONB down to the two flags the list renders, and
  // drop the never-used comments — keeps the RSC payload and egress small.
  slimOrdersForList(orders)

  // Replace the stored path with a short-lived signed URL (private bucket).
  const signed = await signOrderPdfs(orders.filter(o => o.pdf_url).map(o => o.id))
  orders.forEach(o => { o.pdf_url = o.pdf_url ? (signed[o.id] ?? null) : null })

  const all = orders ?? []

  return (
    <OrdersPage
      orders={all}
      isAdmin={false}
      canSeeClinician={isCompanyAdmin}
      currentUserId={user.id}
      age={age}
      from={sp.from}
      to={sp.to}
      showDispatch={showDispatch}
    />
  )
}
