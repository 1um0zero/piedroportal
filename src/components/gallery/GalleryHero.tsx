'use client'

import { useTranslations } from 'next-intl'
import type { Section } from '@/types'

// Per-section hero imagery (full-bleed banner that the transparent header sits over).
const HERO_IMG: Record<Section, string> = {
  KIDS:  '/landing/osb-kinderen-hero.jpg',
  MEN:   '/landing/osb-heren.jpg',
  WOMEN: '/landing/osb-dames.jpg',
}

const SECTION_KEY: Record<Section, 'kids' | 'men' | 'women'> = {
  KIDS: 'kids', MEN: 'men', WOMEN: 'women',
}

/**
 * Full-bleed gallery hero. Sits at the very top of the page and is pulled up
 * (-mt-16) so the photo bleeds behind the transparent navbar. Switches per
 * active section (KIDS/MEN/WOMEN). Preview-only for now (see /gallery-preview).
 */
export default function GalleryHero({ section }: { section: Section }) {
  const t = useTranslations('gallery')
  const key = SECTION_KEY[section]

  return (
    <section className="relative -mt-16 w-full h-[360px] sm:h-[440px] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMG[section]}
        alt={t(`hero.${key}.title`)}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* Scrim for legibility under the white header + hero copy */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black/35" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-10 pt-16">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-[-0.02em] text-white drop-shadow-sm">
          {t(`hero.${key}.title`)}
        </h1>
        <p className="mt-3 max-w-xl text-base sm:text-lg text-white/90 drop-shadow-sm">
          {t(`hero.${key}.subtitle`)}
        </p>
        <a
          href="#catalogue"
          className="mt-6 inline-flex w-fit items-center rounded-lg bg-stone-900/90 px-6 py-3
                     text-sm font-medium text-white shadow-sm transition-colors hover:bg-stone-900"
        >
          {t(`hero.${key}.cta`)}
        </a>
      </div>
    </section>
  )
}
