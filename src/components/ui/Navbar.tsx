import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin, isStaffViewer } from '@/lib/roles'
import { routing } from '@/i18n/routing'
import { signOutAction } from '@/app/[locale]/login/actions'
import NavbarClient from './NavbarClient'
import NavbarShell from './NavbarShell'
import HeaderSectionSwitch from './HeaderSectionSwitch'
import NavGalleryLink from './NavGalleryLink'
import HeaderLivingstonLink from './HeaderLivingstonLink'
import { getUserExclusiveLabels } from '@/lib/user-companies'
import { NavbarLocale } from './NavbarLocale'
import { NavbarMobile } from './NavbarMobile'
import NavAdminMenu from './NavAdminMenu'

type Props = { locale: string }

export default async function Navbar({ locale }: Props) {
  const t = await getTranslations('nav')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  let isBackoffice = false
  let isViewer = false     // staff_viewer: global read-only consultant of orders
  let isOperator = false   // back-office users who can act (admin or branch_staff), not just view
  let profile: { role: string; full_name?: string; avatar_url?: string } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles').select('role, full_name, avatar_url').eq('id', user.id).single()
    profile = data
    isAdmin = isPiedroAdmin(profile?.role)
    isViewer = isStaffViewer(profile?.role)
    isOperator = isAdmin || profile?.role === 'branch_staff'
    // "Backoffice" here = anyone whose home is the back-office orders view.
    isBackoffice = isOperator || isViewer
  }

  // Livingstone (LIV) entry: visible to admin/staff or users whose company owns
  // the LIV sigla. `exclusive_label` is an UPPERCASE sigla; match the token.
  let canSeeLiv = false
  if (user) {
    if (isBackoffice) canSeeLiv = true
    else {
      const labels = await getUserExclusiveLabels(user.id)
      canSeeLiv = labels.some((l) => l.toUpperCase() === 'LIV')
    }
  }

  // Count of portal-origin orders awaiting staff validation (badge on Orders).
  let newOrdersCount = 0
  if (isAdmin) {
    const service = createServiceClient()
    const { count } = await service
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted')
      .is('dataverse_id', null)
      .or('approval_state.is.null,approval_state.eq.registered')
    newOrdersCount = count ?? 0
  }

  return (
    <NavbarShell>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-8">

        {/* Logo → homepage. Two variants: the normal one (solid header) and a
            white silhouette shown only over the transparent hero header. */}
        <Link href="/" className="flex items-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://ynybmsbtcmmxdabvhuny.supabase.co/storage/v1/object/public/products/__brand/piedro-logo.png"
            alt="Piedro International"
            className="logo-normal h-12 w-auto"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/piedro-logo-white.png"
            alt="Piedro International"
            className="logo-white h-12 w-auto"
          />
        </Link>

        {/* Section switcher — only on the gallery hero route (preview) */}
        <HeaderSectionSwitch />

        {/* Nav links — hidden on mobile */}
        <nav className="hidden lg:flex items-center gap-6 flex-1">
          <NavGalleryLink />
          <HeaderLivingstonLink visible={canSeeLiv} />
          {/* STOCK is public like the gallery — browsing needs no login; ordering gates
              later. Everyone except piedro_admin (who gets /admin/stock) sees this. */}
          {!isAdmin && !isViewer && (
            <Link href="/stock" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
              {t('stock')}
            </Link>
          )}
          {user && !isBackoffice && (
            <>
              <Link href="/orders/dashboard" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                {t('dashboard')}
              </Link>
              <Link href="/orders" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                {t('orders')}
              </Link>
            </>
          )}
          {user && isBackoffice && (
            <>
              {/* Dashboard + products are for operators (admin/branch_staff); a pure
                  viewer (VSI) gets the orders view only. */}
              {isOperator && (
                <Link href="/admin" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                  {t('dashboard')}
                </Link>
              )}
              <Link href="/admin/orders" className="relative text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                {t('orders_admin')}
                {newOrdersCount > 0 && (
                  <span className="absolute -top-2 -right-3 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-gold text-white rounded-full flex items-center justify-center">
                    {newOrdersCount > 99 ? '99+' : newOrdersCount}
                  </span>
                )}
              </Link>
              {isOperator && (
                <Link href="/admin/products" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                  {t('products')}
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link href="/admin/stock" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
                    {t('stock')}
                  </Link>
                  {/* Low-frequency admin areas grouped in one dropdown to keep the bar short */}
                  <NavAdminMenu />
                </>
              )}
            </>
          )}
          {/* Wishlist — needs client for count */}
          <NavbarClient />
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
          isBackoffice={isBackoffice}
          isOperator={isOperator}
          isLoggedIn={!!user}
          locale={locale}
          locales={[...routing.locales]}
          newOrdersCount={newOrdersCount}
        />
      </div>
    </NavbarShell>
  )
}
