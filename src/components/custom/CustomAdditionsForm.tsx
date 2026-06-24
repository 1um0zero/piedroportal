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
          <div className="flex gap-2">
            <input inputMode="numeric" placeholder="L" value={sv.l ?? ''} onChange={e => setSide(f.key, 'l', num(e))}
              className="w-1/2 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <input inputMode="numeric" placeholder="R" value={sv.r ?? ''} onChange={e => setSide(f.key, 'r', num(e))}
              className="w-1/2 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          </div>
        ) : (
          <input inputMode="numeric" value={single} onChange={e => set(f.key, num(e))}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
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
                <div>{g.fields.map(renderField)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return <div className="space-y-4">{CUSTOM_SECTIONS.map(renderSection)}</div>
}
