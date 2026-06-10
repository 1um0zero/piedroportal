'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

import { LoginHeroSvg } from './LoginHeroSvg'
import LoginCard from './LoginCard'

const LOGO = 'https://ynybmsbtcmmxdabvhuny.supabase.co/storage/v1/object/public/products/__brand/piedro-logo.png'

export default function LoginForm({ hasError }: { hasError?: boolean }) {
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen flex">
      {/* Hero — SVG technical illustration on dark background */}
      <div className="hidden lg:flex lg:w-3/5 flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1a2c3d 0%, #0f1d2a 60%, #0a1520 100%)' }}>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* One Step Ahead — top */}
        <div className="relative z-10 px-12 pt-10 pb-2">
          <a href="https://www.piedro.com" target="_blank" rel="noopener noreferrer"
            className="group inline-block">
            <p className="text-white/50 text-xs tracking-[0.4em] uppercase font-light mb-1 group-hover:text-[#B8975A] transition-colors">
              Always
            </p>
            <p className="text-white text-4xl font-bold tracking-[0.15em] uppercase leading-none group-hover:text-[#B8975A] transition-colors">
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

        {/* SVG — fills remaining space below the tagline */}
        <div className="flex-1 flex items-center justify-center px-8 pb-8">
          <LoginHeroSvg />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-[#F4F4F5]">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Piedro" className="h-10 w-auto" />
          </div>

          <LoginCard hasError={hasError} />

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
