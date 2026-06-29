'use client'

import { useLocale } from 'next-intl'
import { useState } from 'react'
import {
  CUSTOM_SECTIONS, customLabel,
  type CustomField, type CustomSection,
} from './custom-additions-config'

type Vals = Record<string, unknown>
type Sided = { l?: number | string | ''; r?: number | string | '' }

function isActive(values: Vals, key?: string): boolean {
  if (!key) return true
  const v = values[key]
  if (v == null || v === '' || v === false) return false
  if (typeof v === 'object') { const s = v as Sided; return !!(s.l || s.r) }
  return true
}

// Position of each numbered measurement on the reference diagram (% of width/height).
const MEASURE_MARKERS: Record<string, { x: number; y: number }> = {
  '1': { x: 86, y: 94 }, '2': { x: 75, y: 50 }, '3': { x: 63, y: 40 }, '4': { x: 36, y: 80 },
  '5': { x: 54, y: 27 }, '6': { x: 11, y: 21 }, '7': { x: 93, y: 71 }, '8': { x: 6, y: 74 },
}

/** Special layout for the "Last Measurements" group: narrow L/R mm inputs flanking
 *  a centred numbered title, beside the foot reference diagram. Focusing a row
 *  highlights the matching measurement on the diagram in gold. */
function MeasurementGrid({
  fields, image, values, locale, setSide, num,
}: {
  fields: CustomField[]
  image: string
  values: Vals
  locale: string
  setSide: (key: string, side: 'l' | 'r', v: number | string | '') => void
  num: (e: React.ChangeEvent<HTMLInputElement>) => number | ''
}) {
  // hover previews the marker; focus pins it (stays fixed until another field is focused)
  const [hover, setHover] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const active = focused ?? hover
  const inputCls = (on: boolean) =>
    `w-16 rounded-lg border px-2 py-2 text-sm text-center tabular-nums transition-colors
     ${on ? 'border-gold ring-1 ring-gold/40' : 'border-stone-300'}`

  const rows = fields.map(f => {
    const full = customLabel(f.label, locale)
    const m = /^\s*(\d+)\s*[:.]\s*(.*)$/.exec(full)
    const no = m?.[1] ?? ''
    const title = m?.[2] ?? full
    const sv = (values[f.key] as Sided) ?? {}
    const on = active === no
    return (
      <div key={f.key}
        onMouseEnter={() => no && setHover(no)} onMouseLeave={() => setHover(null)}
        className="grid grid-cols-[auto_1fr_auto] items-center gap-2 py-1">
        <div className="flex items-center gap-1 justify-self-start">
          <input inputMode="numeric" value={sv.l ?? ''} onChange={e => setSide(f.key, 'l', num(e))}
            onFocus={() => no && setFocused(no)} onBlur={() => setFocused(null)} className={inputCls(on)} />
          <span className="text-[11px] text-stone-400">mm</span>
        </div>
        <div className={`text-left text-xs font-medium ${on ? 'text-gold' : 'text-stone-600'}`}>
          <span className="text-stone-400">{no}.</span> {title}
        </div>
        <div className="flex items-center gap-1 justify-self-end">
          <input inputMode="numeric" value={sv.r ?? ''} onChange={e => setSide(f.key, 'r', num(e))}
            onFocus={() => no && setFocused(no)} onBlur={() => setFocused(null)} className={inputCls(on)} />
          <span className="text-[11px] text-stone-400">mm</span>
        </div>
      </div>
    )
  })

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">
        <div className="mb-1 grid grid-cols-[auto_1fr_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
          <span className="w-16 text-left">Left</span><span /><span className="w-16 text-left">Right</span>
        </div>
        {rows}
      </div>
      <div className="relative mx-auto w-full max-w-[300px] shrink-0 lg:w-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Last measurements diagram" className="w-full object-contain" />
        {active && MEASURE_MARKERS[active] && (
          <span aria-hidden
            className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold bg-gold/10 animate-pulse"
            style={{ left: `${MEASURE_MARKERS[active].x}%`, top: `${MEASURE_MARKERS[active].y}%` }} />
        )}
      </div>
    </div>
  )
}

/** Config-driven CUSTOM additions form. Renders sections → groups → fields with
 *  L/R mm inputs, toggles, dropdowns and conditional children. Deliberately
 *  simpler than the OSB AdditionsForm (no GLB/sole/ZSM machinery) — a clean
 *  canvas to iterate the custom-made set on. */
export default function CustomAdditionsForm({
  values, onChange,
}: {
  values: Vals
  onChange: (next: Vals) => void
}) {
  const locale = useLocale()
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(CUSTOM_SECTIONS.map((s, i) => [s.key, i === 0])),
  )

  const set = (key: string, v: unknown) => onChange({ ...values, [key]: v })
  const setSide = (key: string, side: 'l' | 'r', v: number | string | '') => {
    const cur = (values[key] as Sided) ?? {}
    onChange({ ...values, [key]: { ...cur, [side]: v } })
  }

  const num = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s*mm$/i, '').trim()
    return raw === '' ? '' : Number(raw)
  }

  function renderField(f: CustomField) {
    if (!isActive(values, f.conditionalOn)) return null
    const label = customLabel(f.label, locale)
    const hint = f.hint ? customLabel(f.hint, locale) : null
    const indent = f.conditionalOn ? 'ml-6' : ''

    if (f.type === 'toggle') {
      const on = values[f.key] === true
      return (
        <label key={f.key} className={`flex items-center gap-2 py-1.5 cursor-pointer ${indent}`}>
          <input type="checkbox" checked={on} onChange={e => set(f.key, e.target.checked)}
            className="h-4 w-4 accent-[#B8975A]" />
          {f.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.thumb} alt={label}
              className={`${f.thumbWide ? 'h-9 w-[72px]' : 'h-9 w-9'} shrink-0 rounded-md border border-stone-200 bg-white object-contain p-0.5`} />
          )}
          <span className="text-sm text-stone-700">{label}</span>
          {f.picturePending && <span className="text-[10px] text-stone-400">(image pending)</span>}
        </label>
      )
    }

    if (f.type === 'image') {
      const selected = (values[f.key] as string) || null
      // collapse: once a value is picked, show only it; click again to reveal all
      const shown = f.collapse && selected ? [selected] : (f.values ?? [])
      return (
        <div key={f.key} className={`py-2 ${indent}`}>
          <label className="mb-2 block text-xs text-stone-500">{label}</label>
          <div className="flex flex-wrap gap-2.5">
            {shown.map(v => {
              const val = String(v)
              const src = f.images?.[val]
              const on = selected === val
              return (
                <button key={val} type="button" title={val}
                  onClick={() => set(f.key, on ? '' : val)}
                  className={`group relative flex w-[104px] flex-col items-center rounded-xl border p-2 transition-all
                    ${on ? 'border-gold bg-gold/5 ring-2 ring-gold/30 shadow-sm' : 'border-stone-200 bg-white hover:border-gold/60'}`}>
                  {src
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={src} alt={val} className="pointer-events-none h-[68px] w-full object-contain" />
                    : <div className="flex h-[68px] w-full items-center justify-center text-[10px] text-stone-300">—</div>}
                  <span className={`mt-1 text-[11px] font-medium ${on ? 'text-gold' : 'text-stone-600'}`}>{val}</span>
                  {on && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-white shadow-sm">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (f.type === 'option') {
      const sided = f.side === 'both'
      const chipRow = (sel: string | null, pick: (v: string) => void) => {
        const shown = f.collapse && sel ? [sel] : (f.values ?? [])
        return (
          <div className="flex flex-wrap gap-1.5">
            {shown.map(v => {
              const val = String(v); const on = sel === val
              return (
                <button key={val} type="button" onClick={() => pick(on ? '' : val)}
                  className={`rounded border px-3 py-1.5 text-xs font-medium transition-all
                    ${on ? 'border-gold bg-gold text-white shadow-sm' : 'border-stone-200 bg-white text-stone-600 hover:border-gold/60 hover:text-gold'}`}>
                  {val}
                </button>
              )
            })}
          </div>
        )
      }
      const sv = (values[f.key] as Sided & { l?: string; r?: string }) ?? {}
      return (
        <div key={f.key} className={`py-1.5 ${indent}`}>
          <label className="mb-1 block text-xs text-stone-500">{label}</label>
          {sided ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><span className="w-4 text-[10px] text-stone-400">L</span>{chipRow((sv.l as string) ?? null, v => setSide(f.key, 'l', v as unknown as number | ''))}</div>
              <div className="flex items-center gap-2"><span className="w-4 text-[10px] text-stone-400">R</span>{chipRow((sv.r as string) ?? null, v => setSide(f.key, 'r', v as unknown as number | ''))}</div>
            </div>
          ) : chipRow((values[f.key] as string) ?? null, v => set(f.key, v))}
        </div>
      )
    }

    if (f.type === 'text' || f.type === 'upload') {
      return (
        <div key={f.key} className={`py-1.5 ${indent}`}>
          <label className="block text-xs text-stone-500 mb-1">{label}{f.type === 'upload' && ' ⤴'}</label>
          <input type="text" value={(values[f.key] as string) ?? ''} onChange={e => set(f.key, e.target.value)}
            placeholder={f.type === 'upload' ? 'file upload — coming soon' : ''}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
      )
    }

    // mm
    const sided = f.side === 'both'
    const sv = (values[f.key] as Sided) ?? {}
    const single = (values[f.key] as number | '' | undefined) ?? ''
    return (
      <div key={f.key} className={`py-1.5 ${indent}`}>
        <label className="block text-xs text-stone-500 mb-1">
          {label}{hint && <span className="ml-1 text-stone-400">· {hint}</span>}
        </label>
        {sided ? (
          <div className="flex items-center gap-2">
            <input inputMode="numeric" placeholder="L" value={sv.l ?? ''} onChange={e => setSide(f.key, 'l', num(e))}
              className="flex-1 min-w-0 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <input inputMode="numeric" placeholder="R" value={sv.r ?? ''} onChange={e => setSide(f.key, 'r', num(e))}
              className="flex-1 min-w-0 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <span className="text-sm text-stone-400 shrink-0">mm</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input inputMode="numeric" value={single} onChange={e => set(f.key, num(e))}
              className="flex-1 min-w-0 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <span className="text-sm text-stone-400 shrink-0">mm</span>
          </div>
        )}
      </div>
    )
  }

  function renderSection(s: CustomSection) {
    const isOpen = open[s.key]
    const filled = s.groups.flatMap(g => g.fields).filter(f => isActive(values, f.key)).length
    const empty = s.groups.every(g => g.fields.length === 0)
    return (
      <div key={s.key} className="rounded-[14px] border border-stone-200 bg-white" style={{ boxShadow: 'var(--shadow-card)' }}>
        <button type="button" onClick={() => setOpen(o => ({ ...o, [s.key]: !o[s.key] }))}
          className="flex w-full items-center justify-between px-5 py-4">
          <span className="font-medium text-stone-800">{customLabel(s.label, locale)}</span>
          <span className="flex items-center gap-3 text-sm text-stone-400">
            {empty ? <em className="text-xs">coming next</em> : filled > 0 && <span className="text-gold">{filled}</span>}
            <span>{isOpen ? '−' : '+'}</span>
          </span>
        </button>
        {isOpen && !empty && (
          <div className="space-y-4 border-t border-stone-100 px-5 py-4">
            {s.groups.map(g => (
              <div key={g.key}>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">{customLabel(g.label, locale)}</h4>
                {g.render === 'measurements' && g.image ? (
                  <MeasurementGrid fields={g.fields} image={g.image} values={values}
                    locale={locale} setSide={setSide} num={num} />
                ) : (
                  <div>{g.fields.map(renderField)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return <div className="space-y-4">{CUSTOM_SECTIONS.map(renderSection)}</div>
}
