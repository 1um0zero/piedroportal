import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSettings } from '@/lib/settings'
import { addWorkingDays, daysUntil } from '@/lib/dispatch'
import { escapeHtml } from '@/lib/escape-html'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Daily one-time reminder for forgotten draft orders (vercel.json cron).
 *
 * Requested by Anabela (2026-07-13): a client had many orders sitting in
 * draft, convinced she had already submitted them. Each draft untouched for
 * app_settings.draft_reminder_days working days (default 2; 0 disables) is
 * included in ONE reminder email — the draft_reminder_sent_at stamp makes it
 * once-per-draft, ever. Drafts are grouped so a user with many forgotten
 * drafts gets a single email listing all of them, in their latest draft's
 * locale. Fail-closed on CRON_SECRET like the other crons.
 */

type DraftRow = {
  id: string
  user_id: string | null
  locale: string | null
  patient_name: string | null
  reference_customer: string | null
  created_at: string
  updated_at: string | null
  products: { colour_id?: string } | { colour_id?: string }[] | null
}

const lastTouch = (d: DraftRow) =>
  d.updated_at && d.updated_at > d.created_at ? d.updated_at : d.created_at

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 })

  const service = createServiceClient()
  const [settings, { data, error }] = await Promise.all([
    getSettings(['draft_reminder_days', 'email_from']),
    service.from('orders')
      .select('id, user_id, locale, patient_name, reference_customer, created_at, updated_at, products(colour_id)')
      .eq('status', 'draft')
      .is('draft_reminder_sent_at', null),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const days = parseInt(settings.draft_reminder_days || '2', 10)
  if (!(days > 0)) return NextResponse.json({ ok: true, disabled: true })
  const from = settings.email_from || process.env.EMAIL_FROM
  if (!from) return NextResponse.json({ error: 'Sender (email_from) not configured' }, { status: 500 })

  // Working days (weekends + PT holidays) since the draft was last touched —
  // factory closures don't apply here, a draft is the client's own desk.
  const noClosures = new Set<string>()
  const due = ((data ?? []) as unknown as DraftRow[]).filter(d =>
    d.user_id && (daysUntil(addWorkingDays(lastTouch(d), days, noClosures)) ?? 1) <= 0)

  // One email per user, listing all their due drafts.
  const byUser = new Map<string, DraftRow[]>()
  for (const d of due) {
    const list = byUser.get(d.user_id!) ?? []
    list.push(d)
    byUser.set(d.user_id!, list)
  }
  if (!byUser.size) return NextResponse.json({ ok: true, drafts: 0, emails: 0 })

  const { data: profs } = await service
    .from('profiles').select('id, email').in('id', [...byUser.keys()])
  const emailById = new Map((profs ?? []).map(p => [p.id as string, p.email as string | null]))

  const resend = new Resend(apiKey)
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.piedro.pt'
  let emails = 0, drafts = 0

  for (const [userId, list] of byUser) {
    const to = emailById.get(userId)
    if (!to) continue
    list.sort((a, b) => lastTouch(b).localeCompare(lastTouch(a)))
    const locale = list[0].locale ?? 'en'
    const t = await getTranslations({ locale, namespace: 'emails' })
    const link = `${site}/${locale}/orders?status=draft`

    const rows = list.map(d => {
      const product = Array.isArray(d.products) ? d.products[0] : d.products
      const who = d.patient_name || d.reference_customer || '—'
      const date = lastTouch(d).slice(0, 10)
      return `<tr>
        <td style="padding:6px 12px 6px 0;font-size:14px;color:#1C1917;font-weight:500">${escapeHtml(product?.colour_id ?? '—')}</td>
        <td style="padding:6px 12px 6px 0;font-size:14px;color:#44403C">${escapeHtml(who)}</td>
        <td style="padding:6px 0;font-size:13px;color:#78716C;white-space:nowrap">${escapeHtml(date)}</td>
      </tr>`
    }).join('')

    const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A96E;margin:0 0 24px">Piedro Portal</p>
      <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 12px">${escapeHtml(t('draft_reminder_heading', { count: list.length }))}</h2>
      <p style="font-size:14px;color:#44403C;margin:0 0 20px">${escapeHtml(t('draft_reminder_intro', { count: list.length }))}</p>
      <div style="margin:0 0 20px;padding:12px 16px;background:#FAF8F4;border-left:3px solid #C9A96E;border-radius:6px">
        <table style="border-collapse:collapse;width:100%"><tbody>${rows}</tbody></table>
      </div>
      <a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 22px;background:#B8975A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">${escapeHtml(t('draft_reminder_cta'))}</a>
      <p style="font-size:12px;color:#A8A29E;margin-top:24px">${escapeHtml(t('draft_reminder_footer'))}</p>
    </div>`

    const { error: sendErr } = await resend.emails.send({
      from, to: [to], subject: t('draft_reminder_subject', { count: list.length }), html,
    }).catch((e: Error) => ({ error: { message: e.message } }))
    if (sendErr) {
      console.error('draft reminder email failed', userId, String((sendErr as { message?: string }).message ?? sendErr))
      continue // unstamped — retried on the next daily run
    }

    const { error: stampErr } = await service.from('orders')
      .update({ draft_reminder_sent_at: new Date().toISOString() })
      .in('id', list.map(d => d.id))
      .eq('status', 'draft')
    if (stampErr) console.error('draft reminder stamp failed', userId, stampErr.message)
    emails++
    drafts += list.length
  }

  return NextResponse.json({ ok: true, due: due.length, drafts, emails })
}
