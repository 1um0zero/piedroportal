'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { requestPasswordResetAction } from '@/app/[locale]/forgot-password/actions'

export default function ForgotPasswordForm() {
  const t = useTranslations('forgotPassword')
  const [state, action, pending] = useActionState(requestPasswordResetAction, null)

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-2xl font-semibold tracking-[0.22em] text-stone-900 uppercase mb-1">Piedro</p>
          <p className="text-[11px] font-medium tracking-[0.3em] text-gold uppercase">Portal</p>
        </div>

        {state?.ok ? (
          <div className="bg-white rounded-[14px] p-8 space-y-3 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-semibold text-stone-800">{t('sent_title')}</h2>
            <p className="text-sm text-stone-500">{t('sent_desc')}</p>
            <Link href="/login" className="inline-block text-sm text-gold hover:underline mt-2">← {t('back_to_login')}</Link>
          </div>
        ) : (
          <div className="bg-white rounded-[14px] p-8 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div>
              <h1 className="text-base font-semibold text-stone-800">{t('title')}</h1>
              <p className="text-xs text-stone-500 mt-1.5">{t('description')}</p>
            </div>
            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('email')}</label>
                <input name="email" type="email" required autoComplete="email"
                  className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors" />
              </div>
              <button type="submit" disabled={pending}
                className="w-full h-10 bg-gold text-white text-sm font-semibold rounded-lg
                           hover:bg-gold-dark transition-colors duration-150 disabled:opacity-60
                           flex items-center justify-center gap-2">
                {pending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {t('submit')}
              </button>
            </form>
            <p className="text-center text-xs text-stone-400">
              <Link href="/login" className="text-gold hover:underline">← {t('back_to_login')}</Link>
            </p>
          </div>
        )}

        <p className="text-center text-xs text-stone-400 mt-6">Piedro International © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
