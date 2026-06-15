import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { createServiceClient } from '@/lib/supabase/service'
import GrandOpening from '@/components/admin/GrandOpening'

/**
 * Grand Opening — done. The cut-over to production happened at 00:00 on
 * 15 June 2026. This page now stands as a live confirmation, kept for every
 * Piedro admin.
 */
export default async function GrandOpeningPage() {
  await requirePiedroAdminPage()
  const service = createServiceClient()

  const [{ count: migratedOrders }, { count: users }] = await Promise.all([
    service.from('orders').select('id', { count: 'exact', head: true }).not('dataverse_id', 'is', null),
    service.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  return <GrandOpening migratedOrders={migratedOrders ?? 0} users={users ?? 0} />
}
