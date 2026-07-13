import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSettings } from '@/lib/settings'
import { addWorkingDays, daysUntil } from '@/lib/dispatch'
import { logAdminAction } from '@/lib/admin/audit'
import { sendReopenClientEmail, sendReopenDeskNote, orderRefLabel } from '@/lib/reopen-emails'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Daily follow-up of orders sitting in 'changes_requested' (vercel.json cron).
 *
 * Working days since the reopen (weekends + PT holidays + factory closures
 * excluded), thresholds from app_settings:
 *   reopen_reminder_days (default 3)  → one reminder email to the client
 *   reopen_cancel_days   (default 10) → automatic soft-cancel, client + order
 *                                       desk notified; 0 disables auto-cancel.
 * The VSI console voids cancelled orders on its next poll of exported orders.
 * Fail-closed on CRON_SECRET like the campaigns processor.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const [settings, { data: cl }, { data: orders, error }] = await Promise.all([
    getSettings(['reopen_reminder_days', 'reopen_cancel_days']),
    service.from('factory_closures').select('date'),
    service.from('orders')
      .select('id, user_id, order_seq, reference_customer, locale, reopened_at, reopened_by, reopen_reason, reopen_reminder_sent_at, products(colour_id)')
      .eq('status', 'changes_requested'),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reminderDays = parseInt(settings.reopen_reminder_days || '3', 10)
  const cancelDays   = parseInt(settings.reopen_cancel_days || '10', 10)
  const closures = new Set((cl ?? []).map(r => (r as { date: string }).date))

  let reminders = 0, cancelled = 0
  for (const o of orders ?? []) {
    if (!o.reopened_at) continue
    const reason = o.reopen_reason ?? '—'

    // Auto-cancel first: past the cancel deadline a reminder is pointless.
    if (cancelDays > 0 && (daysUntil(addWorkingDays(o.reopened_at, cancelDays, closures)) ?? 1) <= 0) {
      const { error: upErr } = await service.from('orders')
        .update({ status: 'cancelled' }).eq('id', o.id).eq('status', 'changes_requested')
      if (upErr) { console.error('reopen auto-cancel failed', o.id, upErr.message); continue }
      cancelled++
      await logAdminAction({
        actorId: null, actorRole: 'system',
        action: 'order_reopen_auto_cancel', orderId: o.id,
        details: { reason, working_days: cancelDays, reopened_by: o.reopened_by },
      })
      await sendReopenClientEmail(service, 'auto_cancelled', o, reason)
      await sendReopenDeskNote(
        'reopen_desk_auto_cancelled_subject', 'reopen_desk_auto_cancelled_body',
        { ref: orderRefLabel(o), days: cancelDays }, reason,
      )
      continue
    }

    if (reminderDays > 0 && !o.reopen_reminder_sent_at
      && (daysUntil(addWorkingDays(o.reopened_at, reminderDays, closures)) ?? 1) <= 0) {
      const emailErr = await sendReopenClientEmail(service, 'reminder', o, reason)
      if (!emailErr) {
        reminders++
        await service.from('orders')
          .update({ reopen_reminder_sent_at: new Date().toISOString() }).eq('id', o.id)
      } else {
        console.error('reopen reminder email failed', o.id, emailErr)
      }
    }
  }

  return NextResponse.json({ ok: true, open: orders?.length ?? 0, reminders, cancelled })
}
