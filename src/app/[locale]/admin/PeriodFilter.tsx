'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PeriodFilter — full-width dual-thumb MONTH range slider that scopes the
// dashboard KPIs and breakdowns to a period. Spans from the month of the very
// first order up to the current month.
//
// Interaction: while dragging, the gold segment + labels update live (instant
// feedback); the server is hit exactly ONCE, on release (pointer up / key up) —
// no "Apply" button, no timed debounce. Runs inside a transition so the numbers
// dim while the server re-aggregates instead of looking frozen.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, useTransition } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import PiedroLogoLoader from '@/components/ui/PiedroLogoLoader'

/** Inclusive list of `YYYY-MM` keys from `min` to `max`. */
function buildMonths(min: string, max: string): string[] {
  const [y0, m0] = min.split('-').map(Number)
  const [y1, m1] = max.split('-').map(Number)
  const out: string[] = []
  let y = y0, m = m0
  // Guard against a malformed range producing an unbounded loop.
  for (let i = 0; i < 600 && (y < y1 || (y === y1 && m <= m1)); i++) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    if (++m > 12) { m = 1; y++ }
  }
  return out.length ? out : [min]
}

export function PeriodFilter({ min, max, from, to }:
  { min: string; max: string; from: string; to: string }) {
  const months = useMemo(() => buildMonths(min, max), [min, max])
  const last = months.length - 1

  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const locale = useLocale()
  const t = useTranslations('dashboard.period')
  const [isPending, start] = useTransition()

  const idxOf = (m: string) => { const i = months.indexOf(m); return i < 0 ? 0 : i }

  const [lo, setLo] = useState(() => idxOf(from))
  const [hi, setHi] = useState(() => idxOf(to))

  // Re-sync when the server hands back new bounds (e.g. after Reset) — done
  // during render, not in an effect, to avoid a cascading re-render. onChange and
  // the release event (pointer/key up) are separate discrete events, so React has
  // already flushed lo/hi by the time release() reads them — no refs needed.
  const [syncKey, setSyncKey] = useState(`${from}|${to}`)
  if (syncKey !== `${from}|${to}`) {
    setSyncKey(`${from}|${to}`)
    setLo(idxOf(from)); setHi(idxOf(to))
  }

  const label = (i: number) => {
    const [y, m] = months[i].split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
  }
  const pct = (i: number) => (last === 0 ? 0 : (i / last) * 100)
  const active = lo > 0 || hi < last

  const commit = (loI: number, hiI: number) => {
    const params = new URLSearchParams(sp.toString())
    if (loI <= 0 && hiI >= last) { params.delete('from'); params.delete('to') }
    else { params.set('from', months[loI]); params.set('to', months[hiI]) }
    const qs = params.toString()
    const url = (qs ? `${pathname}?${qs}` : pathname) as Parameters<typeof router.replace>[0]
    start(() => router.replace(url))
  }
  const release = () => commit(lo, hi)
  const reset = () => { setLo(0); setHi(last); commit(0, last) }

  return (
    <div className="bg-white rounded-[14px] px-6 py-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider shrink-0">{t('title')}</h2>
          <span className={`text-sm font-semibold truncate transition-opacity ${isPending ? 'opacity-40' : ''} ${active ? 'text-gold' : 'text-stone-500'}`}>
            {active ? `${label(lo)} → ${label(hi)}` : t('all')}
          </span>
          {isPending && <PiedroLogoLoader size={22} duration={1.1} className="shrink-0" />}
        </div>
        {active && (
          <button onClick={reset} disabled={isPending}
            className="text-xs text-stone-400 hover:text-gold transition-colors shrink-0 disabled:opacity-40">
            {t('reset')}
          </button>
        )}
      </div>

      {/* Dual-thumb slider: two transparent-track range inputs stacked over a
          shared track; only the thumbs receive pointer events (see globals.css). */}
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-stone-200" />
        <div className="absolute h-1.5 rounded-full bg-gold"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        <input
          type="range" min={0} max={last} step={1} value={lo}
          aria-label={t('start')}
          onChange={e => setLo(Math.min(Number(e.target.value), hi))}
          onPointerUp={release} onKeyUp={release}
          className="period-range" style={{ zIndex: lo >= last ? 5 : 3 }}
        />
        <input
          type="range" min={0} max={last} step={1} value={hi}
          aria-label={t('end')}
          onChange={e => setHi(Math.max(Number(e.target.value), lo))}
          onPointerUp={release} onKeyUp={release}
          className="period-range" style={{ zIndex: 4 }}
        />
      </div>

      <div className="flex justify-between mt-1.5 text-[10px] text-stone-400">
        <span>{label(0)}</span>
        <span>{label(last)}</span>
      </div>
    </div>
  )
}
