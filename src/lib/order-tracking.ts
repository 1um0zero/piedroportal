import type { createServiceClient } from '@/lib/supabase/service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderLike = { id: string; status?: string; production_state?: string | null; tracking_link?: string | null; expected_dispatch_date?: string | null;[k: string]: any }

type Svc = ReturnType<typeof createServiceClient>

async function attachColumn(
  orders: OrderLike[], service: Svc, column: 'tracking_link' | 'tracking_code' | 'expected_dispatch_date', ids: string[],
): Promise<void> {
  if (!ids.length) return
  const map = new Map<string, string | null>()
  for (let i = 0; i < ids.length; i += 500) {
    const { data, error } = await service.from('orders').select(`id, ${column}`).in('id', ids.slice(i, i + 500))
    if (error || !data) return // column not present yet → degrade gracefully
    for (const r of data) map.set((r as { id: string }).id, (r as Record<string, string | null>)[column] ?? null)
  }
  for (const o of orders) if (map.has(o.id)) o[column] = map.get(o.id) ?? null
}

/**
 * Attach `tracking_link` (delivered orders) and `expected_dispatch_date` (all
 * orders) from separate, tolerant queries — kept out of the main SELECT so the
 * orders pages keep working before those columns exist (run supabase-add-tracking.sql
 * and supabase-dispatch.sql to add them).
 */
export async function attachOrderExtras(orders: OrderLike[], service: Svc): Promise<void> {
  const delivered = orders.filter(o => o.status === 'delivered' || o.production_state === 'delivered').map(o => o.id)
  await attachColumn(orders, service, 'tracking_link', delivered)
  await attachColumn(orders, service, 'tracking_code', delivered)
  await attachColumn(orders, service, 'expected_dispatch_date', orders.map(o => o.id))
}
