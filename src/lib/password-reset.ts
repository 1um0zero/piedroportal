import 'server-only'
import { randomBytes, createHash } from 'crypto'
import { Resend } from 'resend'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSettings } from '@/lib/settings'
import { escapeHtml } from '@/lib/escape-html'

/**
 * Self-owned password reset / first-login flow (replaces Supabase's recovery email).
 * Security (canonical): tokens are random 32-byte secrets; only their SHA-256 hash
 * is stored; single-use (claimed atomically); short TTL; password set via service role.
 */

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
const LOCALES = ['en', 'nl', 'fr', 'de'] as const
type Loc = (typeof LOCALES)[number]

const sha256 = (raw: string) => createHash('sha256').update(raw).digest('hex')
const lazyResend = (): Resend | null => {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}

/**
 * Create a reset token and email the user a localized link. Always silent about
 * whether the address exists (no user enumeration); failures are logged, not thrown.
 */
export async function requestPasswordReset(email: string, fallbackLocale: string): Promise<void> {
  const clean = email.trim().toLowerCase()
  if (!clean) return

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles').select('id, email, preferred_locale')
    .ilike('email', clean).limit(1).maybeSingle()
  if (!profile?.id) return // unknown address — say nothing

  // Dedupe: if a still-valid, unused link was issued in the last 10 minutes,
  // don't send another (protects against repeated button clicks / inbox spam).
  const recent = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count: recentCount } = await service
    .from('password_reset_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .is('used_at', null)
    .gt('created_at', recent)
  if (recentCount && recentCount > 0) return

  const raw = randomBytes(32).toString('base64url')
  const { error: insErr } = await service.from('password_reset_tokens').insert({
    token_hash: sha256(raw),
    user_id: profile.id,
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  })
  if (insErr) { console.error('reset token insert:', insErr.message); return }

  const resend = lazyResend()
  const { email_from } = await getSettings(['email_from'])
  const from = email_from ?? process.env.EMAIL_FROM
  if (!resend || !from) { console.error('reset email skipped: Resend/EMAIL_FROM not configured'); return }

  const locale: Loc = LOCALES.includes(profile.preferred_locale as Loc)
    ? (profile.preferred_locale as Loc)
    : (LOCALES.includes(fallbackLocale as Loc) ? (fallbackLocale as Loc) : 'en')
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.piedro.pt'
  const prefix = locale === 'en' ? '' : `/${locale}`
  const link = `${site}${prefix}/set-password?token=${encodeURIComponent(raw)}`

  const t = await getTranslations({ locale, namespace: 'emails' })
  // Admin-editable overrides (per locale) → fall back to the i18n defaults.
  const ov = await getSettings([
    `reset_subject_${locale}`, `reset_heading_${locale}`, `reset_body_${locale}`, `reset_cta_${locale}`,
  ])
  const subject = ov[`reset_subject_${locale}`] || t('reset_subject')
  const heading = ov[`reset_heading_${locale}`] || t('reset_heading')
  const body    = ov[`reset_body_${locale}`]    || t('reset_body')
  const cta     = ov[`reset_cta_${locale}`]     || t('reset_cta')

  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
    <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B8975A;margin:0 0 24px">Piedro Portal</p>
    <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 12px">${escapeHtml(heading)}</h2>
    <p style="font-size:14px;color:#44403C;line-height:1.5;margin:0 0 24px">${escapeHtml(body)}</p>
    <div style="margin:0 0 28px">
      <a href="${link}" style="background:#B8975A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">${escapeHtml(cta)}</a>
    </div>
  </div>`

  await resend.emails.send({ from, to: [profile.email ?? clean], subject, html })
    .catch(e => console.error('reset email send:', e))
}

/**
 * Atomically claim + consume a token and set the new password. Single-use is
 * enforced by the conditional update (used_at IS NULL).
 */
export async function consumePasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<{ ok?: boolean; error?: 'invalid' | 'too_short' | string }> {
  if (!rawToken) return { error: 'invalid' }
  if (!newPassword || newPassword.length < 8) return { error: 'too_short' }

  const service = createServiceClient()
  const tokenHash = sha256(rawToken)

  // Atomic claim: only succeeds if the token exists and is unused.
  const { data: claimed } = await service
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .select('user_id, expires_at')
    .maybeSingle()

  if (!claimed || new Date(claimed.expires_at).getTime() < Date.now()) return { error: 'invalid' }

  const { error: pwErr } = await service.auth.admin.updateUserById(claimed.user_id, { password: newPassword })
  if (pwErr) return { error: pwErr.message }

  await service.from('profiles').update({ must_set_password: false }).eq('id', claimed.user_id)
  return { ok: true }
}
