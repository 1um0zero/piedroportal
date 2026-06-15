import 'server-only'
import { Resend } from 'resend'
import { getSettings } from '@/lib/settings'
import { getTranslations } from 'next-intl/server'
import { escapeHtml } from '@/lib/escape-html'

const PORTAL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.piedro.pt'

/** Email the Piedro admin that a new user confirmed their account (fire-and-forget). */
export async function notifyAdminNewUser(email: string, fullName: string) {
  const apiKey = process.env.RESEND_API_KEY
  // Recipients/sender/locale from /admin/settings, env fallback. Skip if not configured.
  const cfg = await getSettings(['admin_notify_email', 'email_from', 'notify_locale'])
  // Setting may hold a comma-separated list of addresses.
  const ADMIN_EMAILS = (cfg.admin_notify_email ?? '')
    .split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
  const EMAIL_FROM  = cfg.email_from
  if (!apiKey || !ADMIN_EMAILS.length || !EMAIL_FROM) return   // skip if not fully configured

  const locale = (cfg.notify_locale ?? 'en') as 'en' | 'nl' | 'fr' | 'de'
  const t = await getTranslations({ locale, namespace: 'emails' })
  const resend = new Resend(apiKey)
  const date = new Date().toLocaleString(locale, { timeZone: 'Europe/Amsterdam' })

  await resend.emails.send({
    from: EMAIL_FROM,
    to:   ADMIN_EMAILS,
    subject: t('subject_new_user', { email }),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B8975A;margin:0 0 24px">Piedro Portal</p>
        <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 20px">${escapeHtml(t('heading_new_user'))}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#44403C">
          <tr><td style="padding:8px 0;color:#78716C;width:100px">${escapeHtml(t('label_name'))}</td><td style="padding:8px 0;font-weight:500">${escapeHtml(fullName || '—')}</td></tr>
          <tr><td style="padding:8px 0;color:#78716C">${escapeHtml(t('label_email'))}</td><td style="padding:8px 0;font-weight:500">${escapeHtml(email)}</td></tr>
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
  }).catch(err => console.error('Notification email failed:', err))
}
