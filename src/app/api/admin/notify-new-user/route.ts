import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getTranslations } from 'next-intl/server'
import { escapeHtml } from '@/lib/escape-html'
import { getSettings } from '@/lib/settings'

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET
const PORTAL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.piedro.pt'

/**
 * Supabase DB webhook → notify Piedro of a new user. Fail-closed: requires
 * SUPABASE_WEBHOOK_SECRET to be configured AND matched (no secret = reject, never
 * an open email-trigger endpoint). Recipients/sender/locale come from
 * /admin/settings (app_settings) with env fallback.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!WEBHOOK_SECRET || auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: { type?: string; record?: Record<string, unknown> }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.type !== 'INSERT') return NextResponse.json({ ok: true })
  const { email, full_name, created_at } = payload.record ?? {}
  if (!email) return NextResponse.json({ ok: true })

  const key = process.env.RESEND_API_KEY
  const cfg = await getSettings(['admin_notify_email', 'email_from', 'notify_locale'])
  // Setting may hold a comma-separated list of addresses.
  const adminEmails = (cfg.admin_notify_email ?? process.env.ADMIN_NOTIFY_EMAIL ?? '')
    .split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
  const emailFrom  = cfg.email_from         ?? process.env.EMAIL_FROM
  if (!key || !adminEmails.length || !emailFrom) return NextResponse.json({ ok: true, skipped: 'email not configured' })

  const locale = (['en', 'nl', 'fr', 'de'].includes(cfg.notify_locale) ? cfg.notify_locale : 'en') as 'en' | 'nl' | 'fr' | 'de'
  const t = await getTranslations({ locale, namespace: 'emails' })
  const date = new Date((created_at as string) ?? Date.now()).toLocaleString(locale, { timeZone: 'Europe/Amsterdam' })

  const resend = new Resend(key)
  const { error } = await resend.emails.send({
    from: emailFrom,
    to: adminEmails,
    subject: t('subject_new_user', { email: email as string }),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B8975A;margin:0 0 24px">Piedro Portal</p>
        <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 20px">${escapeHtml(t('heading_new_user'))}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#44403C">
          <tr><td style="padding:8px 0;color:#78716C;width:100px">${escapeHtml(t('label_name'))}</td><td style="padding:8px 0;font-weight:500">${escapeHtml(full_name as string) || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#78716C">${escapeHtml(t('label_email'))}</td><td style="padding:8px 0;font-weight:500">${escapeHtml(email as string)}</td></tr>
          <tr><td style="padding:8px 0;color:#78716C">${escapeHtml(t('label_date'))}</td><td style="padding:8px 0">${escapeHtml(date)}</td></tr>
        </table>
        <div style="margin:32px 0">
          <a href="${PORTAL_URL}/admin/users"
             style="background:#B8975A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:600;display:inline-block">
            ${escapeHtml(t('new_user_cta'))}
          </a>
        </div>
        <p style="font-size:12px;color:#A8A29E">${escapeHtml(t('new_user_note'))}</p>
      </div>
    `,
  })

  if (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
