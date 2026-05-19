'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { signInAction } from '@/app/[locale]/login/actions'

// Joyful, light: children running — perfect for orthopedic brand
const HERO = 'https://images.unsplash.com/photo-1476234251651-f353703a034d?auto=format&fit=crop&w=1800&q=85'
const LOGO = 'https://ynybmsbtcmmxdabvhuny.supabase.co/storage/v1/object/public/products/__brand/piedro-logo.png'

export default function LoginForm({ searchParams }: { searchParams?: { error?: string } }) {
  const t = useTranslations('auth')
  const hasError = searchParams?.error === '1'

  return (
    <div className="min-h-screen flex">

      {/* ── Left: hero ───────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-3/5 relative flex-col justify-between p-12"
        style={{
          backgroundImage: `url(${HERO})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a2c3d]/80 via-[#1a2c3d]/50 to-[#1a2c3d]/20" />

        {/* Logo in white pill */}
        <div className="relative z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Piedro" className="h-9 w-auto" />
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10 space-y-2">
          <p className="text-white/70 text-sm tracking-[0.3em] uppercase">Always</p>
          <p className="text-white text-4xl font-bold tracking-widest uppercase leading-tight">
            One Step<br />Ahead
          </p>
          <div className="w-10 h-0.5 bg-[#B8975A] mt-3" />
        </div>
      </div>

      {/* ── Right: form ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-[#F9F7F4]">
        <div className="w-full max-w-sm space-y-8">

          {/* Logo mobile */}
          <div className="flex justify-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Piedro" className="h-10 w-auto" />
          </div>

          {/* Card */}
          <div className="bg-white rounded-[14px] p-8 space-y-5"
            style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.08)' }}>
            <div>
              <h1 className="text-lg font-semibold text-stone-800">{t('login')}</h1>
              <p className="text-xs text-stone-400 mt-0.5">Piedro International B.V.</p>
            </div>

            {/* Server Action form — redirect handled server-side */}
            <form action={signInAction} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {t('email')}
                </label>
                <input
                  type="email" name="email" required autoComplete="email"
                  className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[#B8975A]/30 focus:border-[#B8975A]
                             transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  {t('password')}
                </label>
                <input
                  type="password" name="password" required autoComplete="current-password"
                  className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[#B8975A]/30 focus:border-[#B8975A]
                             transition-colors"
                />
              </div>

              {hasError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {t('error')}
                </p>
              )}

              <button
                type="submit"
                className="w-full h-11 bg-[#B8975A] text-white text-sm font-semibold rounded-lg
                           hover:bg-[#9A7A42] transition-colors flex items-center justify-center">
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
