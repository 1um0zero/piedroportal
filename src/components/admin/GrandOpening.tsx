'use client'

import { useTranslations } from 'next-intl'

/** Champagne bottle + glass, gold line illustration. */
function Champagne() {
  return (
    <svg viewBox="0 0 120 120" className="w-24 h-24" fill="none" stroke="#B8975A" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* cork flying */}
      <rect x="20" y="8" width="9" height="12" rx="3" transform="rotate(-25 24 14)" />
      {/* sparkle lines */}
      <path d="M34 22l5-5M30 13l1-7M40 30l7-2" />
      {/* bottle (tilted) */}
      <g transform="rotate(20 60 75)">
        <path d="M55 38 q0 8 -5 13 q-6 6 -6 16 v26 q0 5 5 5 h16 q5 0 5 -5 v-26 q0-10 -6-16 q-5-5 -5-13 v-9 h-4z" />
        <path d="M54 27h10" />
        <rect x="48" y="62" width="26" height="14" rx="2" />
      </g>
      {/* glass */}
      <path d="M94 62 q-1 14 -8 17 v15" />
      <path d="M86 62 q1 14 8 17" transform="translate(8 0)" />
      <path d="M88 62 h14" />
      <path d="M93 96 h12" />
      {/* bubbles */}
      <circle cx="97" cy="50" r="1.6" /><circle cx="103" cy="44" r="1.4" /><circle cx="99" cy="37" r="1.2" />
    </svg>
  )
}

export default function GrandOpening({ migratedOrders }: { migratedOrders: number }) {
  const t = useTranslations('grandOpening')

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="bg-white rounded-[14px] p-10 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex justify-center mb-4">
          <Champagne />
        </div>
        <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-gold mb-2">{t('live_eyebrow')}</p>
        <h1 className="text-3xl font-semibold text-stone-800 mb-3">{t('live_title')}</h1>

        <div className="inline-flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-3 py-1 mb-6">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {t('live_when')}
        </div>

        <p className="text-sm text-stone-500 leading-relaxed mb-4">{t('live_body')}</p>
        <p className="text-base text-stone-700 font-medium leading-relaxed">{t('live_moment')}</p>

        <div className="mt-8 pt-6 border-t border-stone-100">
          <p className="text-3xl font-semibold text-stone-800">{migratedOrders}</p>
          <p className="text-xs text-stone-500 mt-0.5">{t('live_migrated')}</p>
        </div>
      </div>
    </div>
  )
}
