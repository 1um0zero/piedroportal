import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { routing } from '@/i18n/routing'
import { signOutAction } from '@/app/[locale]/login/actions'
import NavbarClient from './NavbarClient'
import { NavbarLocale } from './NavbarLocale'
import { NavbarMobile } from './NavbarMobile'

type Props = { locale: string }

export default async function Navbar({ locale }: Props) {
  const t = await getTranslations('nav')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  let profile: { role: string; full_name?: string; avatar_url?: string } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles').select('role, full_name, avatar_url').eq('id', user.id).single()
    profile = data
    isAdmin = profile?.role === 'piedro_admin'
  }

  return (
    <header className="bg-white border-b border-stone-100 relative" style={{ boxShadow: 'var(--shadow-nav)' }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">

        {/* Logo */}
        <Link href="/gallery" className="flex items-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://ynybmsbtcmmxdabvhuny.supabase.co/storage/v1/object/public/products/__brand/piedro-logo.png"
            alt="Piedro International"
            className="h-12 w-auto"
          />
        </Link>

        {/* Nav links — hidden on mobile */}
        <nav className="hidden lg:flex items-center gap-6 flex-1">
          <Link href="/gallery" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
            {t('gallery')}
          </Link>
          {user && !isAdmin && (
            <>
              <Link href="/orders/dashboard" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                Dashboard
              </Link>
              <Link href="/orders" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                {t('orders')}
              </Link>
            </>
          )}
          {user && isAdmin && (
            <>
              <Link href="/admin" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                Dashboard
              </Link>
              <Link href="/admin/orders" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                Orders
              </Link>
              <Link href="/admin/users" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                Users
              </Link>
            </>
          )}
          {/* Wishlist — needs client for count */}
          <NavbarClient locale={locale} />
        </nav>

        {/* Right: language + auth — hidden on mobile */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Language switcher — saves preference to profile */}
          <NavbarLocale locales={[...routing.locales]} current={locale} />

          {/* Auth — server-rendered, no flash */}
          <div className="border-l border-stone-100 pl-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                {/* Profile avatar link */}
                {(() => {
                  const avatarUrl = (profile as unknown as Record<string,string> | null)?.avatar_url
                  const initials  = (profile as unknown as Record<string,string> | null)?.full_name
                    ?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                    ?? user.email?.[0]?.toUpperCase() ?? '?'
                  return (
                    <Link href="/profile"
                      className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-stone-200 hover:ring-gold transition-all shrink-0">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full bg-gold/10 flex items-center justify-center text-[11px] font-bold text-gold">
                          {initials}
                        </span>
                      )}
                    </Link>
                  )
                })()}
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

        {/* Mobile hamburger — only on mobile */}
        <NavbarMobile
          isAdmin={isAdmin}
          isLoggedIn={!!user}
          locale={locale}
          locales={[...routing.locales]}
        />
      </div>
    </header>
  )
}
