import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { isSuperAdmin } from '@/lib/roles'
import { createServiceClient } from '@/lib/supabase/service'
import GrandOpening from '@/components/admin/GrandOpening'

/**
 * Grand Opening — one-time cut-over from the test phase to production.
 * Visible to every Piedro admin; EXECUTION is super_admin only (enforced
 * again in the server action).
 */
export default async function GrandOpeningPage() {
  const scope = await requirePiedroAdminPage()
  const canExecute = isSuperAdmin(scope.role)
  const service = createServiceClient()

  const [{ count: portalOrders }, { count: stockOrders }, { count: migratedOrders }] = await Promise.all([
    service.from('orders').select('id', { count: 'exact', head: true }).is('dataverse_id', null),
    service.from('stock_orders').select('id', { count: 'exact', head: true }),
    service.from('orders').select('id', { count: 'exact', head: true }).not('dataverse_id', 'is', null),
  ])

  return (
    <GrandOpening
      portalOrders={portalOrders ?? 0}
      stockOrders={stockOrders ?? 0}
      migratedOrders={migratedOrders ?? 0}
      canExecute={canExecute}
    />
  )
}
