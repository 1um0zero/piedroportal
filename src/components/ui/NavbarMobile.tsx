'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { NavbarLocale } from './NavbarLocale'
import { signOutAction } from '@/app/[locale]/login/actions'

type Props = {
  isAdmin:      boolean
  isSuper?:     boolean
  isBackoffice: boolean
  isLoggedIn:   boolean
  locale:       string
  locales:      string[]
  newOrdersCount?: number
}

export function NavbarMobile({ isAdmin, isSuper = false, isBackoffice, isLoggedIn, locale, locales, newOrdersCount = 0 }: Props) {
  const [open, setOpen] = useState(false)
  const t = useTranslations('nav')
  const close = () => setOpen(false)

  const linkCls = 'flex items-center py-3.5 text-sm font-semibold tracking-wider uppercase text-stone-700 hover:text-stone-900 border-b border-stone-50 transition-colors'

  return (
    <>
      {/* Hamburger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="lg:hidden flex items-center justify-center w-10 h-10 -mr-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
        aria-label="Menu"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Dimmed overlay */}
          <div className="fixed inset-0 top-16 bg-black/10 z-40 lg:hidden" onClick={close} />

          {/* Slide-down menu */}
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-stone-100 z-50 lg:hidden"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
            <div className="max-w-7xl mx-auto px-6 py-1">

              <Link href="/gallery" onClick={close} className={linkCls}>{t('gallery')}</Link>

              {isLoggedIn && !isBackoffice && (
                <>
                  <Link href="/stock"            onClick={close} className={linkCls}>{t('stock')}</Link>
                  <Link href="/orders/dashboard" onClick={close} className={linkCls}>{t('dashboard')}</Link>
                  <Link href="/orders"           onClick={close} className={linkCls}>{t('orders')}</Link>
                </>
              )}

              {isLoggedIn && isBackoffice && (
                <>
                  <Link href="/admin"          onClick={close} className={linkCls}>{t('dashboard')}</Link>
                  <Link href="/admin/orders"   onClick={close} className={linkCls}>
                    {t('orders_admin')}
                    {newOrdersCount > 0 && (
                      <span className="ml-2 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-gold text-white rounded-full inline-flex items-center justify-center">
                        {newOrdersCount > 99 ? '99+' : newOrdersCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/admin/products" onClick={close} className={linkCls}>{t('products')}</Link>
                  {isAdmin && (
                    <>
                      <Link href="/admin/companies" onClick={close} className={linkCls}>{t('companies')}</Link>
                      <Link href="/admin/branches"  onClick={close} className={linkCls}>{t('branches')}</Link>
                      <Link href="/admin/users"     onClick={close} className={linkCls}>{t('users')}</Link>
                      {isSuper && <Link href="/admin/orders/unassigned" onClick={close} className={linkCls}>{t('unassigned')}</Link>}
                      <Link href="/admin/translations" onClick={close} className={linkCls}>{t('translations')}</Link>
                      <Link href="/admin/settings" onClick={close} className={linkCls}>{t('settings')}</Link>
                      <a href="/share/index.html" target="_blank" rel="noopener noreferrer" onClick={close} className={`${linkCls} !text-gold`}>{t('docs')}</a>
                    </>
                  )}
                </>
              )}

              {isLoggedIn && (
                <Link href="/profile" onClick={close} className={linkCls}>Profile</Link>
              )}

              {/* Language + auth */}
              <div className="flex items-center justify-between py-4">
                <NavbarLocale locales={locales} current={locale} />
                {isLoggedIn ? (
                  <form action={signOutAction}>
                    <button type="submit"
                      className="text-xs font-semibold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors">
                      {t('logout')}
                    </button>
                  </form>
                ) : (
                  <Link href="/login" onClick={close}
                    className="text-xs font-semibold uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors">
                    {t('login')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
