'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { useWishlist } from '@/contexts/WishlistContext'
import { useAuth } from '@/contexts/AuthContext'

const LOCALE_LABELS: Record<string, string> = { en: 'EN', nl: 'NL', fr: 'FR', de: 'DE' }

type Props = { locale: string }

export default function Navbar({ locale }: Props) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const { count } = useWishlist()
  const { user, loading, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-stone-100" style={{ boxShadow: 'var(--shadow-nav)' }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">
        {/* Wordmark */}
        <Link href="/gallery" className="flex items-baseline gap-2 shrink-0">
          <span className="text-lg font-semibold tracking-[0.22em] text-stone-900 uppercase">
            Piedro
          </span>
          <span className="text-[10px] font-medium tracking-[0.3em] text-gold uppercase">
            Portal
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-6 flex-1">
          <Link
            href="/gallery"
            className="text-sm text-stone-500 hover:text-stone-900 transition-colors duration-150"
          >
            {t('gallery')}
          </Link>

          {user && (
            <Link
              href="/orders"
              className="text-sm text-stone-500 hover:text-stone-900 transition-colors duration-150"
            >
              {t('orders')}
            </Link>
          )}

          {/* Wishlist */}
          <Link
            href="/wishlist"
            className="relative flex items-center gap-1 text-sm text-stone-500
                       hover:text-stone-900 transition-colors duration-150"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"
              fill={count > 0 ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 text-[10px] font-bold
                               bg-gold text-white rounded-full flex items-center justify-center leading-none">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
        </nav>

        {/* Right: language switcher + auth */}
        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <div className="flex items-center gap-0.5">
            {routing.locales.map((l) => (
              <Link
                key={l}
                href={pathname}
                locale={l}
                className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors duration-150 ${
                  l === locale
                    ? 'text-gold bg-gold/10'
                    : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                }`}
              >
                {LOCALE_LABELS[l]}
              </Link>
            ))}
          </div>

          {/* Auth */}
          {!loading && (
            user ? (
              <div className="flex items-center gap-3 border-l border-stone-100 pl-3">
                <span className="text-xs text-stone-400 max-w-[140px] truncate hidden sm:block">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="text-xs text-stone-500 hover:text-stone-900 transition-colors duration-150"
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <div className="border-l border-stone-100 pl-3">
                <Link
                  href="/login"
                  className="text-xs font-medium text-stone-500 hover:text-stone-900
                             transition-colors duration-150"
                >
                  {t('login')}
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  )
}
