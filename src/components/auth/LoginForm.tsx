'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { signInAction } from '@/app/[locale]/login/actions'
import { useActionState } from 'react'

// Replace with Supabase Storage URL after uploading the image to __brand/login-hero.jpg
const HERO = 'https://ynybmsbtcmmxdabvhuny.supabase.co/storage/v1/object/public/products/__brand/login-hero.jpg'
const LOGO = 'https://ynybmsbtcmmxdabvhuny.supabase.co/storage/v1/object/public/products/__brand/piedro-logo.png'

export default function LoginForm({ hasError }: { hasError?: boolean }) {
  const t = useTranslations('auth')
  const [, action, pending] = useActionState(signInAction, null)

  return (
    <div className="min-h-screen flex">
      {/* Hero */}
      <div className="hidden lg:flex lg:w-3/5 relative flex-col justify-end"
        style={{ backgroundImage: `url(${HERO})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {/* Subtle gradient only at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative z-10 p-12 space-y-3">
          <a href="https://www.piedro.com" target="_blank" rel="noopener noreferrer"
            className="group inline-block">
            <p className="text-white/60 text-xs tracking-[0.4em] uppercase font-light mb-1 group-hover:text-[#B8975A] transition-colors">
              Always
            </p>
            <p className="text-white text-5xl font-bold tracking-[0.15em] uppercase leading-none group-hover:text-[#B8975A] transition-colors"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
              One Step<br />Ahead
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="h-px w-12 bg-[#B8975A]" />
              <span className="text-[#B8975A] text-xs tracking-[0.3em] uppercase font-medium
                               group-hover:tracking-[0.5em] transition-all duration-500">
                piedro.com
              </span>
            </div>
          </a>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-[#F9F7F4]">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Piedro" className="h-10 w-auto" />
          </div>

          <div className="bg-white rounded-[14px] p-8 space-y-5"
            style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.08)' }}>
            <div>
              <h1 className="text-lg font-semibold text-stone-800">{t('login')}</h1>
              <p className="text-xs text-stone-400 mt-0.5">Piedro International B.V.</p>
            </div>

            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('email')}</label>
                <input name="email" type="email" required autoComplete="email"
                  className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[#B8975A]/30 focus:border-[#B8975A] transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('password')}</label>
                <input name="password" type="password" required autoComplete="current-password"
                  className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-[#B8975A]/30 focus:border-[#B8975A] transition-colors" />
              </div>

              {hasError && (
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
            </form>
          </div>

          <p className="text-center text-xs text-stone-400">
            {t('no_account')}{' '}
            <Link href="/register" className="text-[#B8975A] hover:underline font-medium">{t('register')}</Link>
          </p>
          <p className="text-center text-[10px] text-stone-300">Piedro International © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  )
}
