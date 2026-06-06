'use client'

import { useActionState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { setPasswordAction } from '@/app/[locale]/set-password/actions'

export default function SetPasswordForm({ token, titleOverride, bodyOverride }: {
  token?: string
  titleOverride?: string
  bodyOverride?: string
}) {
  const t = useTranslations('setPassword')
  const router = useRouter()
  const [state, action, pending] = useActionState(setPasswordAction, null)

  useEffect(() => {
    if (!state?.ok) return
    // Token mode sets the password without a session → send them to login.
    router.replace(state.viaToken ? '/login' : '/gallery')
  }, [state, router])

  const errorMsg =
    state?.error === 'too_short' ? t('too_short')
    : state?.error === 'mismatch' ? t('mismatch')
    : state?.error === 'invalid_token' ? t('invalid_token')
    : state?.error ? t('generic_error')
    : null

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-2xl font-semibold tracking-[0.22em] text-stone-900 uppercase mb-1">Piedro</p>
          <p className="text-[11px] font-medium tracking-[0.3em] text-gold uppercase">Portal</p>
        </div>

        <div className="bg-white rounded-[14px] p-8 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div>
            <h1 className="text-base font-semibold text-stone-800">{titleOverride || t('title')}</h1>
            <p className="text-xs text-stone-500 mt-1.5">{bodyOverride || t('description')}</p>
          </div>

          <form action={action} className="space-y-4">
            {token && <input type="hidden" name="token" value={token} />}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('new_password')}</label>
              <input name="password" type="password" required autoComplete="new-password" minLength={8}
                className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('confirm_password')}</label>
              <input name="confirm" type="password" required autoComplete="new-password" minLength={8}
                className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors" />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>
            )}

            <button type="submit" disabled={pending}
              className="w-full h-10 bg-gold text-white text-sm font-semibold rounded-lg
                         hover:bg-gold-dark transition-colors duration-150 disabled:opacity-60
                         flex items-center justify-center gap-2">
              {pending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {t('submit')}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">Piedro International © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
