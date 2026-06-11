'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from '@/i18n/navigation'
import { useGallerySection } from '@/contexts/GallerySectionContext'
import type { Section } from '@/types'

const SECTIONS: Section[] = ['KIDS', 'MEN', 'WOMEN']
const KEY: Record<Section, 'kids' | 'men' | 'women'> = { KIDS: 'kids', MEN: 'men', WOMEN: 'women' }

/**
 * KIDS / MEN / WOMEN switcher that lives in the header on the gallery hero
 * route. Drives the shared section so the hero + catalogue follow. Renders
 * nothing anywhere else.
 */
export default function HeaderSectionSwitch() {
  const pathname = usePathname()
  const t = useTranslations('gallery')
  const { section, setSection } = useGallerySection()

  const onHero = pathname === '/gallery-preview' || pathname.endsWith('/gallery-preview')
  if (!onHero) return null

  return (
    <nav className="hidden lg:flex items-center gap-1">
      {SECTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setSection(s)}
          className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors
            ${s === section ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
        >
          {t(KEY[s])}
        </button>
      ))}
    </nav>
  )
}
