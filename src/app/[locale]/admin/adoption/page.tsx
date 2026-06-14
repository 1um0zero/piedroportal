import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { createServiceClient } from '@/lib/supabase/service'
import AdoptionDashboard from '@/components/admin/AdoptionDashboard'

export const dynamic = 'force-dynamic'

/**
 * /admin/adoption — live opening-day adoption view. Reads page_views + profiles
 * + orders to show, in real time, who is arriving and activating. Auto-refreshes
 * client-side. Migrated-user activation is the headline metric.
 */
export default async function AdoptionPage() {
  await requirePiedroAdminPage()
  const service = createServiceClient()

  // Day window in Amsterdam (launch market). June = +02:00.
  const amsDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Amsterdam' })
  const dayStart = `${amsDate}T00:00:00+02:00`

  const migratedTotal = 282 // migrated cohort size at launch

  const [
    pendingRes, viewsRows, ordersRes, usersRes,
  ] = await Promise.all([
    service.from('profiles').select('*', { count: 'exact', head: true }).eq('must_set_password', true),
    service.from('page_views')
      .select('created_at, path, user_id')
      .gte('created_at', dayStart)
      .order('created_at', { ascending: false })
      .limit(20000),
    service.from('orders').select('*', { count: 'exact', head: true }).is('dataverse_id', null).gte('created_at', dayStart),
    service.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const migratedPending = pendingRes.count ?? 0
  const ordersToday = ordersRes.count ?? 0
  const totalUsers = usersRes.count ?? 0
  const rows = viewsRows.data ?? []
  const visitsToday = rows.length
  const activeUsers = new Set(rows.filter(r => r.user_id).map(r => r.user_id)).size
  const anonViews = rows.filter(r => !r.user_id).length

  // Hourly histogram (Amsterdam hour).
  const hourly = Array.from({ length: 24 }, () => 0)
  for (const r of rows) {
    const h = Number(new Date(r.created_at as string).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hour12: false }).slice(0, 2))
    if (h >= 0 && h < 24) hourly[h]++
  }

  // Top paths.
  const pathCount = new Map<string, number>()
  for (const r of rows) {
    const p = (r.path as string) || '/'
    pathCount.set(p, (pathCount.get(p) ?? 0) + 1)
  }
  const topPaths = [...pathCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, n]) => ({ path, n }))

  return (
    <AdoptionDashboard
      data={{
        activated: migratedTotal - migratedPending,
        migratedTotal,
        visitsToday,
        activeUsers,
        anonViews,
        ordersToday,
        totalUsers,
        hourly,
        topPaths,
      }}
    />
  )
}
