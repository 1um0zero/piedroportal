import { requireSuperAdminPage } from '@/lib/admin/scope'
import { createServiceClient } from '@/lib/supabase/service'
import GrandOpening from '@/components/admin/GrandOpening'

/** Grand Opening — one-time cut-over from the test phase to production (super admin). */
export default async function GrandOpeningPage() {
  await requireSuperAdminPage()
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
    />
  )
}
