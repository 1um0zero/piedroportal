'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import ResendConfirmation from './ResendConfirmation'

export default function RegisterForm() {
  const t = useTranslations('auth')

  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const [loading, setLoading]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) { setError(t('passwords_mismatch')); return }
    if (password.length < 8)  { setError(t('password_too_short')); return }

    setLoading(true)
    const sb = createClient()
    const { error: authError } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <p className="text-2xl font-semibold tracking-[0.22em] text-stone-900 uppercase mb-1">
            Piedro
          </p>
          <p className="text-[11px] font-medium tracking-[0.3em] text-gold uppercase">
            Portal
          </p>
        </div>

        {success ? (
          /* Success state */
          <div className="bg-white rounded-[14px] p-8 space-y-4 text-center"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-semibold text-stone-800">{t('register_check_email')}</h2>
            <p className="text-sm text-stone-500">{t('register_confirm_sent')} <strong>{email}</strong></p>
            <div className="pt-2 text-left">
              <ResendConfirmation initialEmail={email} />
            </div>
            <Link href="/login"
              className="inline-block text-sm text-gold hover:underline mt-2">
              ← {t('back_to_login')}
            </Link>
          </div>
        ) : (
          /* Registration form */
          <div className="bg-white rounded-[14px] p-8 space-y-5"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <h1 className="text-base font-semibold text-stone-800">{t('register')}</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: t('full_name'), value: fullName, set: setFullName, type: 'text', auto: 'name' },
                { label: t('email'),    value: email,    set: setEmail,    type: 'email', auto: 'email' },
                { label: t('password'), value: password, set: setPassword, type: 'password', auto: 'new-password' },
                { label: t('confirm_password'), value: confirm, set: setConfirm, type: 'password', auto: 'new-password' },
              ].map(({ label, value, set, type, auto }) => (
                <div key={label} className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                    {label}
                  </label>
                  <input
                    type={type}
                    required
                    autoComplete={auto}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                               text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold/30
                               focus:border-gold transition-colors duration-150"
                  />
                </div>
              ))}

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-gold text-white text-sm font-semibold rounded-lg
                           hover:bg-gold-dark transition-colors duration-150 disabled:opacity-60
                           flex items-center justify-center gap-2"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                   rounded-full animate-spin" />
                )}
                {t('register')}
              </button>
            </form>

            <p className="text-center text-xs text-stone-400">
              {t('already_account')}{' '}
              <Link href="/login" className="text-gold hover:underline">
                {t('login')}
              </Link>
            </p>
          </div>
        )}

        <p className="text-center text-xs text-stone-400 mt-6">
          Piedro International © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
