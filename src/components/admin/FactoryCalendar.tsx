'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ptHolidays } from '@/lib/dispatch'
import { setClosure, recomputeDispatchDatesAction } from '@/app/actions/factory-closures'

type Kind = 'closure' | 'vacation' | 'bridge'
type Closure = { date: string; kind: string; note?: string | null }

const KIND_STYLE: Record<string, string> = {
  closure:  'bg-red-100 text-red-700 border-red-200',
  vacation: 'bg-amber-100 text-amber-700 border-amber-200',
  bridge:   'bg-purple-100 text-purple-700 border-purple-200',
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

// Mon-first weeks for a given year/month (0-based month).
function monthWeeks(year: number, month: number): (Date | null)[][] {
  const first = new Date(Date.UTC(year, month, 1))
  const startDow = (first.getUTCDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)))
  while (cells.length % 7) cells.push(null)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export default function FactoryCalendar({ closures: initial }: { closures: Closure[] }) {
  const t = useTranslations('factoryCalendar')
  const locale = useLocale()
  const [closures, setClosures] = useState<Record<string, string>>(
    () => Object.fromEntries(initial.map(c => [c.date, c.kind])),
  )
  const [kind, setKind] = useState<Kind>('closure')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  // Closures changed since the last dispatch recompute. We save each click
  // immediately but defer the (expensive) recompute until the admin finishes —
  // so marking a whole holiday period doesn't recompute on every single day.
  const [dirty, setDirty] = useState(false)
  const [recomputing, setRecomputing] = useState(false)
  const dirtyRef = useRef(false)
  useEffect(() => { dirtyRef.current = dirty }, [dirty])

  async function recompute() {
    setRecomputing(true); setMsg(null)
    try {
      const res = await recomputeDispatchDatesAction()
      if (res.error) { setMsg(res.error); return }
      setDirty(false)
      setMsg(res.recomputed != null ? t('recomputed', { n: res.recomputed }) : null)
    } finally {
      setRecomputing(false)
    }
  }

  // Auto-recompute on leaving the page (best-effort) if there are pending changes.
  useEffect(() => {
    const flush = () => { if (dirtyRef.current) { dirtyRef.current = false; recomputeDispatchDatesAction().catch(() => {}) } }
    window.addEventListener('pagehide', flush)
    return () => { window.removeEventListener('pagehide', flush); flush() }
  }, [])

  const today = new Date(); today.setUTCHours(0, 0, 0, 0)
  const months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1))
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() }
  })
  const holidaySet = new Set(months.flatMap(m => [...ptHolidays(m.year)]))

  function toggle(d: Date) {
    const key = iso(d)
    const dow = d.getUTCDay()
    if (dow === 0 || dow === 6 || holidaySet.has(key)) return // automatic — not editable
    const currentlyClosed = key in closures
    const nextKind = currentlyClosed ? null : kind
    // optimistic
    setClosures(prev => {
      const next = { ...prev }
      if (nextKind) next[key] = nextKind; else delete next[key]
      return next
    })
    start(async () => {
      const res = await setClosure(key, kind, !currentlyClosed)
      if (res.error) { setMsg(res.error); return }
      setDirty(true) // dispatch recompute is deferred to "reprocess" / page exit
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>
          <p className="text-sm text-stone-500 mt-0.5">{t('description')}</p>
        </div>
        <div className="flex items-center gap-3">
          {pending && <span className="text-xs text-stone-400 inline-flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 border-2 border-stone-300 border-t-gold rounded-full animate-spin" /> {t('saving')}
          </span>}
          {dirty && (
            <button type="button" onClick={recompute} disabled={recomputing}
              className="px-4 py-2 rounded-lg bg-gold text-white text-sm font-semibold hover:bg-gold-dark
                         transition-colors disabled:opacity-50 inline-flex items-center gap-2">
              {recomputing && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {recomputing ? t('recomputing') : t('reprocess')}
            </button>
          )}
        </div>
      </div>

      {dirty && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t('pending_recompute')}
        </p>
      )}

      {/* Kind selector + legend */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{t('mark_as')}</span>
        {(['closure', 'vacation', 'bridge'] as Kind[]).map(k => (
          <button key={k} type="button" onClick={() => setKind(k)}
            className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all
              ${kind === k ? KIND_STYLE[k] + ' ring-2 ring-offset-1 ring-gold/40' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
            {t(`kind_${k}`)}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3 text-[11px] text-stone-400">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-stone-100 border border-stone-200" /> {t('weekend')}</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /> {t('holiday')}</span>
        </span>
      </div>
      {msg && <p className="text-xs text-stone-500">{msg}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {months.map(({ year, month }) => {
          const label = new Date(Date.UTC(year, month, 1)).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
          const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
            new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2))
          return (
            <div key={`${year}-${month}`} className="bg-white rounded-[14px] p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
              <p className="text-sm font-semibold text-stone-700 capitalize mb-3 text-center">{label}</p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayLabels.map((w, i) => <div key={i} className="text-[10px] font-semibold text-stone-300 uppercase pb-1">{w}</div>)}
                {monthWeeks(year, month).flat().map((d, i) => {
                  if (!d) return <div key={i} />
                  const key = iso(d)
                  const dow = d.getUTCDay()
                  const isWeekend = dow === 0 || dow === 6
                  const isHoliday = holidaySet.has(key)
                  const closedKind = closures[key]
                  const isToday = key === iso(today)
                  let cls = 'text-stone-700 bg-white hover:border-gold/60 hover:text-gold cursor-pointer border-stone-100'
                  if (closedKind) cls = (KIND_STYLE[closedKind] ?? KIND_STYLE.closure) + ' cursor-pointer'
                  else if (isHoliday) cls = 'bg-blue-50 text-blue-500 border-blue-100 cursor-not-allowed'
                  else if (isWeekend) cls = 'bg-stone-100 text-stone-300 border-stone-100 cursor-not-allowed'
                  return (
                    <button key={i} type="button" onClick={() => toggle(d)}
                      disabled={isWeekend || isHoliday}
                      title={isHoliday ? t('holiday') : closedKind ? t(`kind_${closedKind}`) : undefined}
                      className={`aspect-square rounded-md border text-xs font-medium flex items-center justify-center transition-all
                        ${cls} ${isToday ? 'ring-2 ring-gold' : ''}`}>
                      {d.getUTCDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
