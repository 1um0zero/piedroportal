'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

// Free Unsplash image — energetic movement, suits "always one step ahead"
const HERO = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1800&q=85'

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
    <div className="min-h-screen flex">

      {/* ── Left: hero ───────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-3/5 relative flex-col justify-between p-12"
        style={{
          backgroundImage: `url(${HERO})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2c3d]/85 via-[#1a2c3d]/60 to-[#1a2c3d]/30" />

        {/* Logo top */}
        <div className="relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/piedro-logo.png"
            alt="Piedro"
            className="h-12 w-auto brightness-0 invert"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const el = e.currentTarget.nextElementSibling as HTMLElement
              if (el) el.style.display = 'block'
            }}
          />
          <div style={{ display: 'none' }}>
            <p className="text-white text-2xl font-semibold tracking-[0.25em] uppercase">Piedro</p>
            <p className="text-[#B8975A] text-[11px] tracking-[0.35em] uppercase mt-0.5">Portal</p>
          </div>
        </div>

        {/* Tagline bottom */}
        <div className="relative z-10 space-y-3">
          <p className="text-white/70 text-sm tracking-[0.3em] uppercase">Always</p>
          <p className="text-white text-4xl font-bold tracking-widest uppercase leading-tight">
            One Step<br />Ahead
          </p>
          <div className="w-10 h-0.5 bg-[#B8975A]" />
        </div>
      </div>

      {/* ── Right: form ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-[#F9F7F4]">
        <div className="w-full max-w-sm space-y-8">

          {/* Logo — mobile */}
          <div className="flex justify-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/piedro-logo.png" alt="Piedro" className="h-10 w-auto"
              onError={(e) => { e.currentTarget.style.display = 'none' }} />
          </div>

          {/* Card */}
          <div className="bg-white rounded-[14px] p-8 space-y-5"
            style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.08)' }}>
            <div>
              <h1 className="text-lg font-semibold text-stone-800">{t('login')}</h1>
              <p className="text-xs text-stone-400 mt-0.5">Piedro International B.V.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {t('email')}
                </label>
                <input type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[#B8975A]/30 focus:border-[#B8975A]
                             transition-colors" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {t('password')}
                </label>
                <input type="password" required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[#B8975A]/30 focus:border-[#B8975A]
                             transition-colors" />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-11 bg-[#B8975A] text-white text-sm font-semibold rounded-lg
                           hover:bg-[#9A7A42] transition-colors disabled:opacity-60
                           flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {t('sign_in')}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-stone-400">
            {t('no_account')}{' '}
            <Link href="/register" className="text-[#B8975A] hover:underline font-medium">
              {t('register')}
            </Link>
          </p>

          <p className="text-center text-[10px] text-stone-300">
            Piedro International © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
