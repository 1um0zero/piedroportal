import 'server-only'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { getSettings } from '@/lib/settings'
import { escapeHtml } from '@/lib/escape-html'

/**
 * Portal-assistant governance helpers (server-only).
 *
 * Consent: a user must accept the chat notice once before the assistant
 * answers. Bumping CHAT_CONSENT_VERSION re-prompts everyone (e.g. after a
 * material change to the wording).
 */
export const CHAT_CONSENT_VERSION = 1

const PORTAL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.piedro.pt'

/** Has this user accepted the *current* consent version? */
export async function hasChatConsent(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('chat_consents')
    .select('id')
    .eq('user_id', userId)
    .eq('text_version', CHAT_CONSENT_VERSION)
    .maybeSingle()
  return !!data
}

/** Record consent (idempotent) and fire confirmation emails (user + admin). */
export async function recordChatConsent(
  userId: string,
  email: string,
  fullName: string,
  locale: string,
): Promise<void> {
  const service = createServiceClient()
  await service
    .from('chat_consents')
    .upsert(
      { user_id: userId, text_version: CHAT_CONSENT_VERSION, locale },
      { onConflict: 'user_id,text_version' },
    )

  // Confirmation / proof-of-consent email to the user and to the alert inbox.
  const apiKey = process.env.RESEND_API_KEY
  const cfg = await getSettings(['chat_notify_email', 'admin_notify_email', 'email_from'])
  const from = cfg.email_from
  if (!apiKey || !from) return
  const admins = (cfg.chat_notify_email ?? cfg.admin_notify_email ?? '')
    .split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
  const resend = new Resend(apiKey)
  const when = new Date().toLocaleString(locale, { timeZone: 'Europe/Amsterdam' })

  const block = (title: string, lead: string) => `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B8975A;margin:0 0 24px">Piedro Portal</p>
      <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 12px">${escapeHtml(title)}</h2>
      <p style="font-size:14px;color:#44403C;margin:0 0 20px">${escapeHtml(lead)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#44403C">
        <tr><td style="padding:6px 0;color:#78716C;width:120px">Name</td><td style="padding:6px 0;font-weight:500">${escapeHtml(fullName || '—')}</td></tr>
        <tr><td style="padding:6px 0;color:#78716C">Email</td><td style="padding:6px 0;font-weight:500">${escapeHtml(email)}</td></tr>
        <tr><td style="padding:6px 0;color:#78716C">Date</td><td style="padding:6px 0">${escapeHtml(when)}</td></tr>
        <tr><td style="padding:6px 0;color:#78716C">Consent v.</td><td style="padding:6px 0">${CHAT_CONSENT_VERSION}</td></tr>
      </table>
    </div>`

  // To the user (proof of opt-in).
  await resend.emails.send({
    from, to: [email],
    subject: 'Piedro Portal — assistant access confirmed',
    html: block('Assistant access confirmed', 'You accepted the assistant notice. This email is your record of that consent.'),
  }).catch(err => console.error('Consent user email failed:', err))

  // To the admin inbox (audit trail).
  if (admins.length) {
    await resend.emails.send({
      from, to: admins,
      subject: `Assistant consent — ${email}`,
      html: block('Assistant consent recorded', `${fullName || email} accepted the assistant notice.`),
    }).catch(err => console.error('Consent admin email failed:', err))
  }
}

/**
 * Append one in/out message to the audit log (fire-and-forget).
 *
 * `impersonatedBy` is the REAL admin when the message was exchanged under
 * "view as" — the session is the target's, so without it the client's record
 * would silently absorb messages they never sent (see migration 058).
 */
export async function logChatMessage(
  userId: string,
  roleSeen: string | null,
  direction: 'in' | 'out',
  content: string,
  impersonatedBy: string | null = null,
): Promise<void> {
  if (!content?.trim()) return
  const service = createServiceClient()
  await service
    .from('chat_logs')
    .insert({ user_id: userId, role_seen: roleSeen, direction, content, impersonated_by: impersonatedBy })
    .then(undefined, err => console.error('chat log failed:', err))
}

/** Raise a feedback item ("should be improved") and alert the super-admin. */
export async function recordChatFeedback(
  userId: string,
  roleSeen: string | null,
  question: string,
  answer: string,
  impersonatedBy: string | null = null,
): Promise<void> {
  const service = createServiceClient()
  await service
    .from('chat_feedback')
    .insert({ user_id: userId, role_seen: roleSeen, question, answer, impersonated_by: impersonatedBy })

  const apiKey = process.env.RESEND_API_KEY
  const cfg = await getSettings(['chat_notify_email', 'admin_notify_email', 'email_from'])
  const from = cfg.email_from
  const admins = (cfg.chat_notify_email ?? cfg.admin_notify_email ?? '')
    .split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
  if (!apiKey || !from || !admins.length) return
  const resend = new Resend(apiKey)

  await resend.emails.send({
    from, to: admins,
    subject: 'Assistant feedback — an answer was flagged for improvement',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B8975A;margin:0 0 24px">Piedro Portal</p>
        <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 16px">An assistant answer was flagged</h2>
        <p style="font-size:13px;color:#78716C;margin:0 0 6px">Question</p>
        <p style="font-size:14px;color:#1C1917;background:#FAFAF9;border:1px solid #E7E5E4;border-radius:8px;padding:12px;margin:0 0 16px;white-space:pre-wrap">${escapeHtml(question || '—')}</p>
        <p style="font-size:13px;color:#78716C;margin:0 0 6px">Answer that needs improving</p>
        <p style="font-size:14px;color:#44403C;background:#FAFAF9;border:1px solid #E7E5E4;border-radius:8px;padding:12px;margin:0 0 24px;white-space:pre-wrap">${escapeHtml(answer || '—')}</p>
        <a href="${PORTAL_URL}/admin/chat-feedback"
           style="background:#B8975A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:600;display:inline-block">
          Review feedback queue
        </a>
      </div>`,
  }).catch(err => console.error('Feedback alert email failed:', err))
}
