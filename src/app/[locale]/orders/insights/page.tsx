import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasAnyCompany, getAdminCompanyIds, userHasInsights } from '@/lib/user-companies'
import { isPiedroAdmin } from '@/lib/roles'
import { fetchAll } from '@/lib/fetch-all'
import { topLevelFields } from '@/lib/insights/metrics'
import InsightsDashboard, { type ClientOrder } from '@/components/insights/InsightsDashboard'

// The Additions Insights dashboard: a customer-facing shoe heat map of additions
// with conformity/outlier monitoring. Gated per company (migration 059) and
// scoped to the user's own orders — a customer only ever sees their own data.
export default async function InsightsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (isPiedroAdmin(profile?.role)) redirect('/admin')

  if (!(await hasAnyCompany(user.id))) redirect('/orders')
  // Entitlement gate — feature is opt-in per company (decided by Piedro staff).
  if (!(await userHasInsights(user.id))) redirect('/orders/dashboard')

  const adminCompanyIds = await getAdminCompanyIds(user.id)
  const isCompanyAdmin = adminCompanyIds.length > 0

  const service = createServiceClient()
  const SELECT = 'id, additions, created_at, clinician, user_id, company_id, companies(name)'
  // Paginated — every metric is computed over this whole array; a truncated fetch
  // would silently under-report the averages and hide outliers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await fetchAll<any>(page => {
    let query = service.from('orders').select(SELECT).neq('status', 'draft')
    if (isCompanyAdmin) query = query.in('company_id', adminCompanyIds)
    else query = query.eq('user_id', user.id)
    return query.order('created_at', { ascending: false }).range(page.from, page.to)
  })

  const t = await getTranslations('insights')

  // Reduce each order to its top-level anatomical additions + breakdown keys.
  const orders: ClientOrder[] = rows.map(o => {
    const company = (Array.isArray(o.companies) ? o.companies[0] : o.companies) as { name?: string } | null
    return {
      fields: topLevelFields(o.additions as Record<string, unknown> | null),
      company: company?.name ?? '—',
      clinician: (o.clinician as string | null) ?? '',
      createdAt: o.created_at as string,
    }
  })

  const multiCompany = new Set(orders.map(o => o.company)).size > 1

  if (orders.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-stone-900 mb-6">{t('title')}</h1>
        <div className="bg-white rounded-[14px] p-16 flex flex-col items-center text-center gap-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <p className="text-sm text-stone-500 max-w-sm">{t('empty')}</p>
        </div>
      </div>
    )
  }

  return <InsightsDashboard orders={orders} multiCompany={multiCompany} />
}
