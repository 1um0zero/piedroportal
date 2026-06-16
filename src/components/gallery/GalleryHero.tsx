'use client'

import { useTranslations } from 'next-intl'
import type { Section } from '@/types'

// Per-section hero imagery. KIDS is a studio shot on a solid tan background, so
// it is shown in full (object-contain on the matching colour — never cropped).
// MEN/WOMEN are environmental shots that read better filling the band (cover).
type HeroCfg = { img: string; fit: 'cover' | 'contain'; bg: string }
const HERO: Record<Section, HeroCfg> = {
  KIDS:  { img: '/landing/osb-kinderen-hero.jpg', fit: 'contain', bg: '#f2ba75' },
  MEN:   { img: '/landing/osb-heren.jpg',         fit: 'cover',   bg: '#414921' },
  WOMEN: { img: '/landing/osb-dames.jpg',         fit: 'cover',   bg: '#2f3030' },
}

const SECTION_KEY: Record<Section, 'kids' | 'men' | 'women'> = {
  KIDS: 'kids', MEN: 'men', WOMEN: 'women',
}

/**
 * Full-bleed gallery hero. Sits at the very top of the page and is pulled up
 * (-mt-16, matching the navbar height) so the photo bleeds behind the
 * transparent navbar. Switches per active section (KIDS/MEN/WOMEN), or shows the
 * Livingstone collection diptych (men + women blend) when an exclusive token is
 * active.
 */
export default function GalleryHero({ section, exclusive = '' }: { section: Section; exclusive?: string }) {
  const t = useTranslations('gallery')
  const key = SECTION_KEY[section]
  const isLiv = exclusive === 'LIV'

  // Livingstone is currently a Men-only collection, so it reuses the Men hero
  // photo and simply shows the "Livingstone" wordmark.
  const cfg: HeroCfg = isLiv ? { ...HERO.MEN } : HERO[section]
  const title = isLiv ? 'Livingstone' : t(`hero.${key}.title`)
  const subtitle = isLiv ? '' : t(`hero.${key}.subtitle`)

  return (
    <section
      className="relative -mt-16 w-full h-[380px] sm:h-[460px] overflow-hidden"
      style={{ backgroundColor: cfg.bg }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cfg.img}
        alt={title}
        className={`absolute inset-0 h-full w-full ${cfg.fit === 'contain' ? 'object-contain' : 'object-cover'} object-center`}
      />
      {/* Scrim: darker at the top (under the white header) and bottom (under the copy). */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/55" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-10 pt-16">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-[-0.02em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-xl text-base sm:text-lg text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}
