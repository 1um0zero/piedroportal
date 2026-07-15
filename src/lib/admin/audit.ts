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
  // Set when the actor performed this action while impersonating another user
  // (act-as). The mutation runs under the target's session, so the actor here is
  // the REAL admin and impersonatedAsUserId is the user they acted on behalf of.
  impersonatedAsUserId?: string | null
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const service = createServiceClient()
    const { error } = await service.from('admin_actions').insert({
      actor_id:        entry.actorId,
      actor_role:      entry.actorRole ?? null,
      action:          entry.action,
      order_id:        entry.orderId ?? null,
      impersonated_as: entry.impersonatedAsUserId ?? null,
      details:         entry.details ?? null,
    })
    if (error) console.error('logAdminAction insert error', error)
  } catch (e) {
    console.error('logAdminAction threw', e)
  }
}

/**
 * Log a record DELETION to admin_actions (identifiers only — never content, RGPD)
 * and report whether the log was written. Call it BEFORE a destructive delete on a
 * path that must be attributable, and refuse the delete if it returns false, so no
 * deletion is ever invisible. (The DB trigger in migration 057 is the universal
 * backstop; this adds the app actor — WHO — which the DB role cannot see.)
 */
export async function logDeletion(entry: {
  actorId: string | null
  actorRole?: string | null
  table: string                   // e.g. 'profiles', 'branches'
  recordId: string
  label?: string | null           // non-sensitive identifier hint (name/email/number)
  impersonatedAsUserId?: string | null
  extra?: Record<string, unknown>
}): Promise<boolean> {
  try {
    const service = createServiceClient()
    const { error } = await service.from('admin_actions').insert({
      actor_id:        entry.actorId,
      actor_role:      entry.actorRole ?? null,
      action:          `${entry.table}_delete`,
      order_id:        null,
      impersonated_as: entry.impersonatedAsUserId ?? null,
      details: { table: entry.table, record_id: entry.recordId, label: entry.label ?? null, ...entry.extra },
    })
    if (error) { console.error('logDeletion insert error', error); return false }
    return true
  } catch (e) {
    console.error('logDeletion threw', e)
    return false
  }
}
