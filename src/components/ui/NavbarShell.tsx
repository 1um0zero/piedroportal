'use client'

import type { ReactNode } from 'react'
import { usePathname } from '@/i18n/navigation'

/**
 * Header shell. On the gallery hero routes it renders transparent so the photo
 * bleeds behind it (logo + links go white via the `.nav-overlay` rules in
 * globals.css); everywhere else it's the normal solid white bar. Non-sticky, so
 * it scrolls away with the hero and never sits white-on-white over page content.
 */
export default function NavbarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() // locale-stripped by next-intl (e.g. "/gallery-preview")
  const overlay = pathname === '/gallery-preview' || pathname.endsWith('/gallery-preview')

  return (
    <header
      className={
        overlay
          ? 'nav-overlay relative z-30'
          : 'relative z-30 bg-white border-b border-stone-100'
      }
      style={overlay ? undefined : { boxShadow: 'var(--shadow-nav)' }}
    >
      {children}
    </header>
  )
}
