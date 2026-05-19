'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

// A high-quality product shot from Supabase Storage — swap for a brand photo when available
const HERO_IMAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/1902.5626.01.png`

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

      {/* ── Left: hero image ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-[#2C3E50]">
        <Image
          src={HERO_IMAGE}
          alt="Piedro orthopedic footwear"
          fill
          sizes="60vw"
          className="object-cover object-center opacity-80 mix-blend-luminosity"
          priority
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2535]/70 via-[#1a2535]/40 to-transparent" />

        {/* Brand tagline */}
        <div className="absolute bottom-12 left-12 space-y-2">
          <p className="text-white/90 text-3xl font-light tracking-widest uppercase">
            Always
          </p>
          <p className="text-white text-3xl font-bold tracking-widest uppercase">
            One Step Ahead
          </p>
          <div className="w-12 h-0.5 bg-gold mt-3" />
        </div>

        {/* Logo top-left */}
        <div className="absolute top-10 left-12">
          <p className="text-white text-xl font-semibold tracking-[0.25em] uppercase">Piedro</p>
          <p className="text-gold text-[10px] tracking-[0.35em] uppercase">Portal</p>
        </div>
      </div>

      {/* ── Right: login form ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-cream">
        <div className="w-full max-w-sm space-y-8">

          {/* Logo (mobile only) */}
          <div className="flex justify-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/piedro-logo.png" alt="Piedro" className="h-10 w-auto" />
          </div>

          {/* Card */}
          <div className="bg-white rounded-[14px] p-8 space-y-5"
            style={{ boxShadow: 'var(--shadow-card)' }}>

            <div>
              <h1 className="text-lg font-semibold text-stone-800">{t('login')}</h1>
              <p className="text-xs text-stone-400 mt-0.5">Piedro International B.V.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {t('email')}
                </label>
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                             text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold/30
                             focus:border-gold transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {t('password')}
                </label>
                <input
                  type="password" required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                             text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold/30
                             focus:border-gold transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full h-11 bg-gold text-white text-sm font-semibold rounded-lg
                           hover:bg-gold-dark transition-colors disabled:opacity-60
                           flex items-center justify-center gap-2">
                {loading && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {t('sign_in')}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-stone-400">
            {t('no_account')}{' '}
            <Link href="/register" className="text-gold hover:underline font-medium">
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
