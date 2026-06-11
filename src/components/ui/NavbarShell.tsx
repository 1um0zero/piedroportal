'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from '@/i18n/navigation'

/**
 * Header shell. Sticky on every page so the bar stays at the top while scrolling.
 * On the gallery hero route it starts transparent (the photo bleeds behind it,
 * logo + links go white via `.nav-overlay`) and fades to the solid white bar once
 * the hero has scrolled past — a subtle transition rather than an abrupt swap.
 */
export default function NavbarShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() // locale-stripped by next-intl
  const onHero = pathname === '/gallery-preview' || pathname.endsWith('/gallery-preview')

  const [solid, setSolid] = useState(false)
  useEffect(() => {
    if (!onHero) return
    const onScroll = () => setSolid(window.scrollY > 360)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onHero])

  const transparent = onHero && !solid
  const base = 'sticky top-0 z-30 transition-colors duration-300'

  return (
    <header
      className={
        transparent
          ? `nav-overlay ${base}`
          : `${base} bg-white border-b border-stone-100`
      }
      style={transparent ? undefined : { boxShadow: 'var(--shadow-nav)' }}
    >
      {children}
    </header>
  )
}
