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
 * (-mt-16) so the photo bleeds behind the transparent navbar. Switches per
 * active section (KIDS/MEN/WOMEN). Hosts the model search, over the photo.
 */
export default function GalleryHero({
  section, search, onSearch, searchPlaceholder, searchTitle,
}: {
  section: Section
  search?: string
  onSearch?: (v: string) => void
  searchPlaceholder?: string
  searchTitle?: string
}) {
  const t = useTranslations('gallery')
  const key = SECTION_KEY[section]
  const cfg = HERO[section]

  return (
    <section
      className="relative -mt-16 w-full h-[380px] sm:h-[460px] overflow-hidden"
      style={{ backgroundColor: cfg.bg }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cfg.img}
        alt={t(`hero.${key}.title`)}
        className={`absolute inset-0 h-full w-full ${cfg.fit === 'contain' ? 'object-contain' : 'object-cover'} object-center`}
      />
      {/* Scrim: darker at the top (under the white header) and bottom (under the copy). */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/55" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col sm:flex-row items-start sm:items-end justify-between gap-5 px-6 pb-10 pt-16">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-[-0.02em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
            {t(`hero.${key}.title`)}
          </h1>
          <p className="mt-3 max-w-xl text-base sm:text-lg text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
            {t(`hero.${key}.subtitle`)}
          </p>
        </div>

        {onSearch && (
          <div className="relative w-full sm:w-[360px] sm:max-w-[42vw] shrink-0">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="search"
              value={search ?? ''}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              title={searchTitle}
              className="h-12 w-full pl-11 pr-4 text-sm rounded-xl bg-white/95 backdrop-blur
                         text-stone-800 placeholder-stone-400 shadow-lg
                         focus:outline-none focus:ring-2 focus:ring-gold/40 focus:bg-white"
            />
          </div>
        )}
      </div>
    </section>
  )
}
