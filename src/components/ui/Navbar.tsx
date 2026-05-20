import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { routing } from '@/i18n/routing'
import { signOutAction } from '@/app/[locale]/login/actions'
import NavbarClient from './NavbarClient'

type Props = { locale: string }

export default async function Navbar({ locale }: Props) {
  const t = await getTranslations('nav')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="bg-white border-b border-stone-100" style={{ boxShadow: 'var(--shadow-nav)' }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">

        {/* Logo */}
        <Link href="/gallery" className="flex items-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://ynybmsbtcmmxdabvhuny.supabase.co/storage/v1/object/public/products/__brand/piedro-logo.png"
            alt="Piedro International"
            className="h-9 w-auto"
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12)) drop-shadow(0 4px 8px rgba(0,0,0,0.08))' }}
          />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-6 flex-1">
          <Link href="/gallery" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
            {t('gallery')}
          </Link>
          {user && (
            <Link href="/orders" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
              {t('orders')}
            </Link>
          )}
          {/* Wishlist — needs client for count */}
          <NavbarClient locale={locale} />
        </nav>

        {/* Right: language + auth */}
        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <div className="flex items-center gap-0.5">
            {routing.locales.map((l) => (
              <Link key={l} href="/" locale={l}
                className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
                  l === locale ? 'text-gold bg-gold/10' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                }`}>
                {l.toUpperCase()}
              </Link>
            ))}
          </div>

          {/* Auth — server-rendered, no flash */}
          <div className="border-l border-stone-100 pl-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-400 max-w-[140px] truncate hidden sm:block">
                  {user.email}
                </span>
                <form action={signOutAction}>
                  <button type="submit"
                    className="text-xs text-stone-500 hover:text-stone-900 transition-colors">
                    {t('logout')}
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors">
                {t('login')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
