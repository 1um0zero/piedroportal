import { createServiceClient } from '@/lib/supabase/service'

/**
 * Append a row to the back-office audit trail (admin_actions).
 *
 * Best-effort: a logging failure must never break the underlying action, so we
 * swallow the error (and console.error it) rather than propagate it. Writes go
 * through the service client because the table is RLS-locked to service only.
 */
export async function logAdminAction(entry: {
  actorId: string | null          // null for non-portal actors (e.g. the A-Shell ERP)
  actorRole?: string | null
  action: string
  orderId?: string | null
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const service = createServiceClient()
    const { error } = await service.from('admin_actions').insert({
      actor_id:   entry.actorId,
      actor_role: entry.actorRole ?? null,
      action:     entry.action,
      order_id:   entry.orderId ?? null,
      details:    entry.details ?? null,
    })
    if (error) console.error('logAdminAction insert error', error)
  } catch (e) {
    console.error('logAdminAction threw', e)
  }
}
