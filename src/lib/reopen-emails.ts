import 'server-only'
import { Resend } from 'resend'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSettings } from '@/lib/settings'
import { escapeHtml } from '@/lib/escape-html'
import { orderNumber } from '@/lib/format'

/**
 * Emails of the reopened-order ("changes requested") lifecycle — used by the
 * staff reopen action, the daily follow-up cron and the client-cancel action.
 * All are best-effort: they return an error string instead of throwing, and a
 * failed email never rolls back the state change it narrates.
 */

export type ReopenOrderRow = {
  id: string
  user_id?: string | null
  order_seq?: number | null
  reference_customer?: string | null
  locale?: string | null
  products?: { colour_id?: string } | { colour_id?: string }[] | null
}

export type ReopenEmailKind = 'reopened' | 'reminder' | 'auto_cancelled'

const KIND_KEYS: Record<ReopenEmailKind, { subject: string; heading: string; intro: string }> = {
  reopened:       { subject: 'reopen_subject',           heading: 'reopen_heading',           intro: 'reopen_intro' },
  reminder:       { subject: 'reopen_reminder_subject',  heading: 'reopen_reminder_heading',  intro: 'reopen_reminder_intro' },
  auto_cancelled: { subject: 'reopen_cancelled_subject', heading: 'reopen_cancelled_heading', intro: 'reopen_cancelled_intro' },
}

export function orderRefLabel(o: ReopenOrderRow): string {
  return (o.order_seq != null ? `#${orderNumber(o.order_seq)}` : null)
    ?? o.reference_customer ?? o.id.slice(0, 8)
}

/** Branded notification to the order's creator, in the order's locale. */
export async function sendReopenClientEmail(
  service: ReturnType<typeof createServiceClient>,
  kind: ReopenEmailKind,
  order: ReopenOrderRow,
  reason: string,
): Promise<string | undefined> {
  try {
    if (!order.user_id) return 'Order has no owner to notify'
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return 'Email service not configured (RESEND_API_KEY missing)'

    const [{ data: owner }, settings] = await Promise.all([
      service.from('profiles').select('email, full_name').eq('id', order.user_id).single(),
      getSettings(['email_from']),
    ])
    const from = settings.email_from || process.env.EMAIL_FROM
    if (!owner?.email || !from) return 'Sender or recipient email not configured'

    const t = await getTranslations({ locale: order.locale ?? 'en', namespace: 'emails' })
    const keys = KIND_KEYS[kind]
    const product = Array.isArray(order.products) ? order.products[0] : order.products
    const ref = orderRefLabel(order)
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.piedro.pt'
    const link = `${site}/${order.locale ?? 'en'}/orders/${order.id}`

    const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A96E;margin:0 0 24px">Piedro Portal</p>
      <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 12px">${escapeHtml(t(keys.heading, { ref }))}</h2>
      <p style="font-size:14px;color:#44403C;margin:0 0 20px">${escapeHtml(t(keys.intro, { model: product?.colour_id ?? '—' }))}</p>
      <div style="margin:0 0 20px;padding:12px 16px;background:#FAF8F4;border-left:3px solid #C9A96E;border-radius:6px">
        <p style="font-size:12px;color:#78716C;margin:0 0 4px">${escapeHtml(t('reopen_reason_label'))}</p>
        <p style="font-size:14px;font-weight:500;color:#1C1917;margin:0;white-space:pre-wrap">${escapeHtml(reason)}</p>
      </div>
      <a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 22px;background:#B8975A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">${escapeHtml(t('reopen_cta'))}</a>
      <p style="font-size:12px;color:#A8A29E;margin-top:24px">${escapeHtml(t('reopen_footer'))}</p>
    </div>`

    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: [owner.email],
      subject: t(keys.subject, { ref }),
      html,
    }).catch((e: Error) => ({ error: { message: e.message } }))
    return error ? String((error as { message?: string }).message ?? error) : undefined
  } catch (e) {
    console.error('sendReopenClientEmail threw', e)
    return e instanceof Error ? e.message : 'Email failed'
  }
}

/** Short note to the Piedro order desk (admin-set locale) — cancellations etc. */
export async function sendReopenDeskNote(
  subjectKey: 'reopen_desk_client_cancelled_subject' | 'reopen_desk_auto_cancelled_subject',
  bodyKey: 'reopen_desk_client_cancelled_body' | 'reopen_desk_auto_cancelled_body',
  vars: Record<string, string | number>,
  reason: string,
): Promise<string | undefined> {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return 'Email service not configured'
    const s = await getSettings(['order_notify_email', 'email_from', 'notify_locale'])
    const from = s.email_from || process.env.EMAIL_FROM
    const to = (s.order_notify_email ?? '').split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
    if (!from || !to.length) return 'Desk recipient or sender not configured'

    const t = await getTranslations({ locale: s.notify_locale || 'en', namespace: 'emails' })
    const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A96E;margin:0 0 24px">Piedro Portal</p>
      <p style="font-size:14px;color:#44403C;margin:0 0 16px">${escapeHtml(t(bodyKey, vars))}</p>
      <div style="padding:12px 16px;background:#FAF8F4;border-left:3px solid #C9A96E;border-radius:6px">
        <p style="font-size:12px;color:#78716C;margin:0 0 4px">${escapeHtml(t('reopen_reason_label'))}</p>
        <p style="font-size:14px;font-weight:500;color:#1C1917;margin:0;white-space:pre-wrap">${escapeHtml(reason)}</p>
      </div>
    </div>`
    const { error } = await new Resend(apiKey).emails.send({
      from, to, subject: t(subjectKey, vars), html,
    }).catch((e: Error) => ({ error: { message: e.message } }))
    return error ? String((error as { message?: string }).message ?? error) : undefined
  } catch (e) {
    console.error('sendReopenDeskNote threw', e)
    return e instanceof Error ? e.message : 'Email failed'
  }
}
