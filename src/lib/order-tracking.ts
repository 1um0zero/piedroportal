import type { createServiceClient } from '@/lib/supabase/service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderLike = { id: string; status?: string; production_state?: string | null; tracking_link?: string | null;[k: string]: any }

/**
 * Attach `tracking_link` to delivered orders from a separate, tolerant query.
 * Kept out of the main SELECT so the orders pages keep working even before the
 * `orders.tracking_link` column exists (run supabase-add-tracking.sql to add it).
 */
export async function attachTracking(
  orders: OrderLike[],
  service: ReturnType<typeof createServiceClient>,
): Promise<void> {
  const ids = orders
    .filter(o => o.status === 'delivered' || o.production_state === 'delivered')
    .map(o => o.id)
  if (!ids.length) return
  const { data, error } = await service.from('orders').select('id, tracking_link').in('id', ids)
  if (error || !data) return // column not present yet → degrade gracefully
  const map = new Map(data.map(r => [r.id, (r as { tracking_link?: string | null }).tracking_link ?? null]))
  for (const o of orders) if (map.has(o.id)) o.tracking_link = map.get(o.id) ?? null
}
