'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const t = useTranslations('auth')

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const sb = createClient()
    const { error: authError } = await sb.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(t('error'))
      setLoading(false)
      return
    }

    window.location.href = '/gallery'
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

        {/* Card */}
        <div
          className="bg-white rounded-[14px] p-8 space-y-5"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <h1 className="text-base font-semibold text-stone-800">
            {t('login')}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                {t('email')}
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                           text-stone-900 placeholder:text-stone-400
                           focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                           transition-colors duration-150"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                {t('password')}
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                           text-stone-900 placeholder:text-stone-400
                           focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                           transition-colors duration-150"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-gold text-white text-sm font-semibold rounded-lg
                         hover:bg-gold-dark transition-colors duration-150 disabled:opacity-60
                         disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white
                                 rounded-full animate-spin" />
              )}
              {t('sign_in')}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          {t('no_account')}{' '}
          <Link href="/register" className="text-gold hover:underline">
            {t('register')}
          </Link>
        </p>

        <p className="text-center text-xs text-stone-400 mt-4">
          Piedro International © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
