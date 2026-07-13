import 'server-only'
import type { createServiceClient } from '@/lib/supabase/service'
import { orderNumber } from '@/lib/format'

export type ReplacementRef = { id: string; label: string } | null

/**
 * Resolve the replacement chain of an order (048/049 reopen flow) into the
 * clickable refs the detail view shows: the cancelled original this order
 * replaces, and/or the corrected order that replaced this one.
 */
export async function getReplacementRefs(
  service: ReturnType<typeof createServiceClient>,
  order: { replaces_order_id?: string | null; replaced_by_order_id?: string | null },
): Promise<{ replacesRef: ReplacementRef; replacedByRef: ReplacementRef }> {
  const ids = [order.replaces_order_id, order.replaced_by_order_id].filter((v): v is string => !!v)
  if (!ids.length) return { replacesRef: null, replacedByRef: null }

  const { data } = await service
    .from('orders').select('id, order_seq, reference_customer').in('id', ids)
  const label = (r: { id: string; order_seq: number | null; reference_customer: string | null }) =>
    r.order_seq != null ? `#${orderNumber(r.order_seq)}` : (r.reference_customer ?? r.id.slice(0, 8))
  const byId = new Map((data ?? []).map(r => [r.id, { id: r.id, label: label(r) }]))

  return {
    replacesRef:   order.replaces_order_id ? byId.get(order.replaces_order_id) ?? null : null,
    replacedByRef: order.replaced_by_order_id ? byId.get(order.replaced_by_order_id) ?? null : null,
  }
}
