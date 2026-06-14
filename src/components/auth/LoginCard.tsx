'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { signInAction, checkMigratedUser, sendMigrationLink } from '@/app/[locale]/login/actions'
import { useActionState } from 'react'
import EmailDeliveryTips from './EmailDeliveryTips'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The white login card (email + password + actions). Single source of truth,
 * reused both by the dedicated /login page and the embedded hero on the
 * marketing landing. On failure signInAction redirects to /login?error=1.
 *
 * Migrated-user nicety: when the email field loses focus we check whether that
 * address is a migrated account that has not set its own password yet. If so we
 * swap the password/submit for a friendly welcome panel that emails a secure
 * set-password link — the user never has to guess their old password.
 */
export default function LoginCard({ hasError, redirectTo }: { hasError?: boolean; redirectTo?: string }) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [state, action, pending] = useActionState(signInAction, null)
  const showError = hasError || !!state?.error

  const [email, setEmail] = useState('')
  const [checkedEmail, setCheckedEmail] = useState('')
  const [migrated, setMigrated] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function onEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const v = e.target.value.trim().toLowerCase()
    setEmail(v)
    if (!v || !EMAIL_RE.test(v)) { setMigrated(false); return }
    if (v === checkedEmail) return            // already evaluated this address
    setCheckedEmail(v)
    setSent(false)
    const { migrated } = await checkMigratedUser(v)
    setMigrated(migrated)
  }

  async function onSendLink() {
    setSending(true)
    await sendMigrationLink(email, locale)
    setSending(false)
    setSent(true)
  }

  return (
    <div className="bg-white rounded-[14px] p-8 space-y-5"
      style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.08)' }}>
      <div>
        <h2 className="text-lg font-semibold text-stone-800">{t('login')}</h2>
        <p className="text-xs text-stone-400 mt-0.5">Piedro International B.V.</p>
      </div>

      <form action={action} className="space-y-4">
        {/* Where to land after sign-in (floating modal passes the current page). */}
        {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('email')}</label>
          <input name="email" type="email" required autoComplete="email"
            defaultValue={email}
            onBlur={onEmailBlur}
            className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[#B8975A]/30 focus:border-[#B8975A] transition-colors" />
        </div>

        {migrated ? (
          /* ── Migrated user: first-time set-password welcome ──────────────── */
          <div className="space-y-4 rounded-lg border border-[#B8975A]/30 bg-[#B8975A]/5 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-stone-800">{t('migrated_welcome_title')}</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{t('migrated_welcome_body')}</p>
            </div>

            {sent ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-stone-700 bg-white rounded-lg border border-stone-200 px-3 py-2">
                  {t('migrated_link_sent', { email })}
                </p>
                <EmailDeliveryTips />
              </div>
            ) : (
              <button type="button" onClick={onSendLink} disabled={sending}
                className="w-full h-11 bg-[#B8975A] text-white text-sm font-semibold rounded-lg
                           hover:bg-[#9A7A42] transition-colors disabled:opacity-60
                           flex items-center justify-center gap-2">
                {sending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {sending ? t('migrated_sending') : t('migrated_send_link')}
              </button>
            )}
          </div>
        ) : (
          /* ── Normal sign-in ──────────────────────────────────────────────── */
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('password')}</label>
              <input name="password" type="password" required autoComplete="current-password"
                className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-[#B8975A]/30 focus:border-[#B8975A] transition-colors" />
            </div>

            {showError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {t('error')}
              </p>
            )}

            <button type="submit" disabled={pending}
              className="w-full h-11 bg-[#B8975A] text-white text-sm font-semibold rounded-lg
                         hover:bg-[#9A7A42] transition-colors disabled:opacity-60
                         flex items-center justify-center gap-2">
              {pending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {t('sign_in')}
            </button>

            <p className="text-center">
              <Link href="/forgot-password" className="text-xs text-stone-400 hover:text-[#B8975A] hover:underline">
                {t('forgot_password')}
              </Link>
            </p>
          </>
        )}

        <p className="text-center text-xs text-stone-400 border-t border-stone-100 pt-4">
          {t('no_account')}{' '}
          <Link href="/register" className="font-medium text-[#B8975A] hover:text-[#9A7A42] hover:underline">
            {t('register')}
          </Link>
        </p>
      </form>
    </div>
  )
}
