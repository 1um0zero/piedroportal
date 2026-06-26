'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

export type GridColour = { id: string; name: string; on: boolean }
export type GridStyle = { style: string; colours: GridColour[] }

type Props = {
  /** The sigla being toggled (e.g. 'UK', 'LIV') — shown in the hint. */
  token: string
  styles: GridStyle[]
  /** Persist a batch of colour_ids on/off for `token`. Returns an error to roll back. */
  onApply: (colourIds: string[], on: boolean) => Promise<{ error?: string }>
}

/**
 * Style → Colour exclusivity grid. Each style expands to its colours; tick
 * specific colours or the whole style ("all colours"). A style shows
 * none / partial / full state. Toggling is ADDITIVE for the given `token`.
 * Presentational: persistence is injected via `onApply`. Re-seed by changing
 * the React `key` (e.g. the active sigla) so the parent can switch tokens.
 */
export default function ExclusiveColourGrid({ token, styles, onApply }: Props) {
  const t = useTranslations('admin.branches')

  // colourId → on (local source of truth, seeded from props then updated optimistically)
  const [on, setOn] = useState<Map<string, boolean>>(
    () => new Map(styles.flatMap(s => s.colours.map(c => [c.id, c.on]))),
  )
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [err, setErr] = useState<string | null>(null)

  const onCount = useMemo(() => [...on.values()].filter(Boolean).length, [on])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return styles
    return styles
      .map(s => {
        if (s.style.toLowerCase().includes(needle)) return s
        const colours = s.colours.filter(c =>
          c.id.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle))
        return colours.length ? { ...s, colours } : null
      })
      .filter(Boolean) as GridStyle[]
  }, [styles, q])

  function styleState(s: GridStyle): 'none' | 'partial' | 'full' {
    const ons = s.colours.filter(c => on.get(c.id)).length
    if (ons === 0) return 'none'
    return ons === s.colours.length ? 'full' : 'partial'
  }

  async function apply(colourIds: string[], next: boolean) {
    if (!colourIds.length) return
    setErr(null)
    setBusy(prev => new Set([...prev, ...colourIds]))
    const res = await onApply(colourIds, next)
    setBusy(prev => { const n = new Set(prev); colourIds.forEach(id => n.delete(id)); return n })
    if (res.error) { setErr(res.error); return }
    setOn(prev => { const n = new Map(prev); colourIds.forEach(id => n.set(id, next)); return n })
  }

  return (
    <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('exclusive_models')}</h2>
        <p className="text-xs text-stone-400">
          {t('exclusive_models_hint', { token })} · {t('selected_n', { n: onCount })}
        </p>
      </div>
      {err && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{err}</div>}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('search_models')}
        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />

      <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-stone-100 divide-y divide-stone-50">
        {filtered.map(s => {
          const st = styleState(s)
          const isOpen = open.has(s.style)
          const styleBusy = s.colours.some(c => busy.has(c.id))
          return (
            <div key={s.style}>
              <div className="flex items-center gap-3 px-3 py-2 hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={st === 'full'}
                  disabled={styleBusy}
                  ref={el => { if (el) el.indeterminate = st === 'partial' }}
                  onChange={() => apply(s.colours.map(c => c.id), st !== 'full')}
                />
                <button type="button" onClick={() => setOpen(p => { const n = new Set(p); if (n.has(s.style)) n.delete(s.style); else n.add(s.style); return n })}
                  className="flex-1 flex items-center gap-2 text-left min-w-0">
                  <span className="text-stone-300 text-xs w-3">{isOpen ? '▾' : '▸'}</span>
                  <span className="text-sm text-stone-700 font-mono truncate">{s.style}</span>
                  <span className={`text-xs ${st === 'full' ? 'text-gold' : st === 'partial' ? 'text-amber-600' : 'text-stone-300'}`}>
                    {st === 'none' ? t('colours_n', { n: s.colours.length })
                      : t('colours_on_n', { on: s.colours.filter(c => on.get(c.id)).length, n: s.colours.length })}
                  </span>
                </button>
              </div>
              {isOpen && (
                <div className="bg-stone-50/60 divide-y divide-stone-100">
                  {s.colours.map(c => (
                    <label key={c.id} className="flex items-center gap-3 pl-10 pr-3 py-1.5 cursor-pointer hover:bg-stone-100/60">
                      <input type="checkbox" checked={!!on.get(c.id)} disabled={busy.has(c.id)}
                        onChange={() => apply([c.id], !on.get(c.id))} />
                      <span className="text-sm text-stone-600 font-mono">{c.id}</span>
                      {c.name && <span className="text-xs text-stone-400 truncate">{c.name}</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <p className="px-3 py-4 text-sm text-stone-400">{t('no_models')}</p>}
      </div>
    </section>
  )
}
