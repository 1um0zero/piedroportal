'use client'

import { useLocale } from 'next-intl'
import { useState } from 'react'
import {
  CUSTOM_SECTIONS, customLabel,
  type CustomField, type CustomSection,
} from './custom-additions-config'

type Vals = Record<string, unknown>
type Sided = { l?: number | ''; r?: number | '' }

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
  const setSide = (key: string, side: 'l' | 'r', v: number | '') => {
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

    if (f.type === 'option') {
      return (
        <div key={f.key} className={`py-1.5 ${indent}`}>
          <label className="block text-xs text-stone-500 mb-1">{label}</label>
          <select value={(values[f.key] as string) ?? ''} onChange={e => set(f.key, e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {f.values?.map(v => <option key={String(v)} value={String(v)}>{String(v)}</option>)}
          </select>
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
