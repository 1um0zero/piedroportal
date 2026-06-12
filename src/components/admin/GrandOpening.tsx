'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { deletePortalTestOrdersAction } from '@/app/actions/grand-opening'

const CONFIRM_WORD = 'OPEN'

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

export default function GrandOpening({ portalOrders, stockOrders, migratedOrders, canExecute }: {
  portalOrders: number; stockOrders: number; migratedOrders: number; canExecute: boolean
}) {
  const t = useTranslations('grandOpening')
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; error?: string; deletedOrders?: number; deletedStockOrders?: number; deletedPdfs?: number } | null>(null)

  const total = portalOrders + stockOrders
  const armed = word.trim().toUpperCase() === CONFIRM_WORD

  async function run() {
    if (!armed || busy) return
    setBusy(true); setResult(null)
    const res = await deletePortalTestOrdersAction()
    setBusy(false); setResult(res)
    if (res.ok) setWord('')
  }

  const steps = ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'] as const

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="bg-white rounded-[14px] p-8 mb-6 flex items-center gap-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <Champagne />
        <div>
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-gold mb-1">Piedro Portal</p>
          <h1 className="text-2xl font-semibold text-stone-800 mb-2">{t('title')}</h1>
          <p className="text-sm text-stone-500 leading-relaxed">{t('intro')}</p>
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { n: portalOrders,   label: t('count_portal_orders'),  danger: true  },
          { n: stockOrders,    label: t('count_stock_orders'),   danger: true  },
          { n: migratedOrders, label: t('count_migrated_kept'),  danger: false },
        ].map((c, i) => (
          <div key={i} className={`bg-white rounded-[14px] px-5 py-4 ${c.danger ? 'border border-red-100' : 'border border-green-100'}`}
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className={`text-2xl font-semibold ${c.danger ? 'text-red-500' : 'text-green-600'}`}>{c.n}</p>
            <p className="text-xs text-stone-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* The cut-over plan */}
      <div className="bg-white rounded-[14px] p-8 mb-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-4">{t('plan_title')}</h2>
        <ol className="space-y-3">
          {steps.map((k, i) => (
            <li key={k} className="flex gap-3 text-sm text-stone-600">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold/10 text-gold text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span className="leading-relaxed">{t(k)}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-stone-400 mt-5">
          {t('users_hint')}{' '}
          <Link href="/admin/users" className="text-gold hover:underline">{t('users_link')}</Link>
        </p>
      </div>

      {/* Danger zone — visible to every admin, executable only by super_admin */}
      <div className="bg-white rounded-[14px] p-8 border border-red-100" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-sm font-bold text-red-500 uppercase tracking-wide mb-2">{t('danger_title')}</h2>
        <p className="text-sm text-stone-500 mb-5 leading-relaxed">
          {t('danger_text', { total, word: CONFIRM_WORD })}
        </p>
        {!canExecute && (
          <p className="text-sm text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {t('super_only')}
          </p>
        )}
        {canExecute && (
        <div className="flex gap-3">
          <input
            value={word}
            onChange={e => setWord(e.target.value)}
            placeholder={CONFIRM_WORD}
            className="h-10 w-36 px-3 text-sm font-semibold tracking-widest text-center bg-stone-50 border border-stone-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
          />
          <button onClick={run} disabled={!armed || busy}
            className="h-10 px-5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
            {busy && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {t('delete_button')}
          </button>
        </div>
        )}

        {result?.error && (
          <p className="mt-4 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{result.error}</p>
        )}
        {result?.ok && (
          <p className="mt-4 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-4 py-3">
            🍾 {t('done', {
              orders: result.deletedOrders ?? 0,
              stock: result.deletedStockOrders ?? 0,
              pdfs: result.deletedPdfs ?? 0,
            })}
          </p>
        )}
      </div>
    </div>
  )
}
