'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SECTIONS, filterExcluded, countFilled, type AdditionField, type AdditionSection } from './additions-config'
import { GlbViewer } from './GlbViewer'

// ── Types ─────────────────────────────────────────────────────────────────────

type SidedVal = { l: unknown; r: unknown }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Additions = Record<string, any>

type Unit = 'PAIR' | 'LEFT' | 'RIGHT' | 'LEFT_RIGHT' | 'DIFF_SIZES'

type Props = {
  unit: Unit
  closure: string         // product closure (LACE/VELCRO) — controls which upper fields show
  addsExclude: string     // comma-separated Dataverse field names to exclude
  additions: Additions
  onChange: (additions: Additions) => void
}

// ── Chip components ───────────────────────────────────────────────────────────

// Text input with datalist — shows valid options, snaps to nearest on blur
let _mmId = 0
function MmInput({ values, value, onChange, onBlurDone }: {
  values: (number | string)[]
  value: unknown
  onChange: (v: number | string | null) => void
  onBlurDone?: (v: number | string | null) => void
}) {
  const [id] = useState(() => `mm-${++_mmId}`)
  const strValues = values.map(String)
  return (
    <div className="relative">
      <input
        list={id}
        type="text"
        inputMode="numeric"
        value={value == null ? '' : String(value)}
        placeholder="mm"
        onChange={e => {
          const typed = e.target.value
          if (typed === '') { onChange(null); return }
          const allowed = strValues.some(v => v.startsWith(typed) || typed === v)
          if (allowed) onChange(typed)
        }}
        onBlur={e => {
          const typed = e.target.value
          if (!typed) { onChange(null); onBlurDone?.(null); return }
          const exact = strValues.find(v => v === typed)
          if (exact) { const n = parseFloat(exact); onChange(n); onBlurDone?.(n); return }
          const v = parseFloat(typed)
          if (isNaN(v)) { onChange(null); onBlurDone?.(null); return }
          const nearest = strValues.reduce((p, c) =>
            Math.abs(parseFloat(c) - v) < Math.abs(parseFloat(p) - v) ? c : p
          )
          const n = parseFloat(nearest); onChange(n); onBlurDone?.(n)
        }}
        className="w-24 h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg text-center
                   focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors"
      />
      <datalist id={id}>
        {strValues.map(v => <option key={v} value={v} />)}
      </datalist>
    </div>
  )
}

// ── Shared option picker (one strip, click fills active foot) ─────────────────
function SharedOptionPicker({ options, valueL, valueR, onChangeL, onChangeR }: {
  options: string[]
  valueL: string; valueR: string
  onChangeL: (v: string | null) => void
  onChangeR: (v: string | null) => void
}) {
  const [active, setActive] = useState<'l'|'r'>('l')
  const current = active === 'l' ? valueL : valueR

  function pick(opt: string) {
    const newVal = current === opt ? null : opt
    if (active === 'l') onChangeL(newVal)
    else onChangeR(newVal)
  }

  return (
    <div className="space-y-2">
      {/* Foot selectors — grid matching other two-column fields */}
      <div className="grid grid-cols-2 gap-4">
        <button type="button" onClick={() => setActive('l')}
          className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg border text-xs transition-all
            ${active === 'l' ? 'border-gold bg-gold/5 font-medium' : 'border-stone-200 hover:border-stone-300'}`}>
          <span className="text-stone-500 font-bold">Left</span>
          <span className={`mx-1 truncate ${valueL ? 'text-stone-800' : 'text-stone-300'}`}>{valueL || '—'}</span>
          {valueL && (
            <span className="shrink-0 text-stone-300 hover:text-red-400 cursor-pointer"
              onClick={e => { e.stopPropagation(); onChangeL(null) }}>×</span>
          )}
        </button>

        <button type="button" onClick={() => setActive('r')}
          className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg border text-xs transition-all
            ${active === 'r' ? 'border-gold bg-gold/5 font-medium' : 'border-stone-200 hover:border-stone-300'}`}>
          <span className="text-stone-500 font-bold">Right</span>
          <span className={`mx-1 truncate ${valueR ? 'text-stone-800' : 'text-stone-300'}`}>{valueR || '—'}</span>
          {valueR && (
            <span className="shrink-0 text-stone-300 hover:text-red-400 cursor-pointer"
              onClick={e => { e.stopPropagation(); onChangeR(null) }}>×</span>
          )}
        </button>
      </div>

      {/* Options strip */}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => pick(opt)}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-all
              ${current === opt
                ? 'bg-gold text-white border-gold shadow-sm'
                : 'text-stone-600 border-stone-200 bg-white hover:border-gold/60 hover:text-gold'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function OptionChips({ values, value, onChange, collapse = false }: {
  values: (number | string)[]
  value: unknown
  onChange: (v: string | null) => void
  collapse?: boolean
}) {
  const displayed = collapse && value != null ? [value as number | string] : values
  return (
    <div className="flex flex-wrap gap-1.5">
      {displayed.map((v) => (
        <button key={String(v)} type="button"
          onClick={() => onChange(value === v ? null : String(v))}
          className={`px-3 py-1.5 text-xs font-medium rounded border transition-all
            ${value === v
              ? 'bg-gold text-white border-gold shadow-sm'
              : 'text-stone-600 border-stone-200 bg-white hover:border-gold/60 hover:text-gold'}`}>
          {v}
        </button>
      ))}
    </div>
  )
}

// Classic select dropdown — used for closure fields in LEFT_RIGHT mode
function SelectCombo({ values, value, onChange }: {
  values: (number | string)[]
  value: unknown
  onChange: (v: string | null) => void
}) {
  return (
    <div className="relative">
      <select
        value={String(value ?? '')}
        onChange={e => onChange(e.target.value || null)}
        className="w-full h-9 pl-3 pr-8 text-sm bg-stone-50 border border-stone-200 rounded-lg
                   appearance-none focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                   transition-colors text-stone-700">
        <option value="">—</option>
        {values.map(v => <option key={String(v)} value={String(v)}>{v}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
      </svg>
    </div>
  )
}

function YesNoToggle({ value, onChange }: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex gap-1.5">
      {(['No', 'Yes'] as const).map((lbl) => {
        const isYes = lbl === 'Yes'
        const active = isYes ? value === true : value === false
        return (
          <button key={lbl} type="button"
            onClick={() => onChange(isYes)}
            className={`px-4 py-1.5 text-xs font-semibold rounded border transition-all
              ${active
                ? isYes
                  ? 'bg-gold text-white border-gold'
                  : 'bg-stone-100 text-stone-600 border-stone-300'
                : 'text-stone-400 border-stone-200 bg-white hover:border-stone-300'}`}>
            {lbl}
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdditionsForm({ unit, closure, addsExclude, additions, onChange }: Props) {
  const t = useTranslations('gallery.filters')
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['additions']))

  // Per-section filter state (replaces single showOnlyActive)
  const [sectionFilter, setSectionFilter] = useState<Record<string, boolean>>({})

  // Checkbox-expand state — covers additions, upper, sole sections
  const [addExpanded, setAddExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const section of SECTIONS) {
      if (section.key === 'others') continue
      for (const field of section.fields) {
        if (field.side === 'global') continue
        const sv = additions[field.key] as SidedVal | null
        if (sv?.l != null && sv.l !== '' && sv.l !== false) s.add(`${field.key}:l`)
        if (sv?.r != null && sv.r !== '' && sv.r !== false) s.add(`${field.key}:r`)
      }
    }
    return s
  })

  // Key concept: PAIR / LEFT / RIGHT → single column
  //              LEFT_RIGHT           → two columns
  const isDouble    = unit === 'LEFT_RIGHT'
  const displaySide: 'l' | 'r' = unit === 'RIGHT' ? 'r' : 'l'
  const sideLabel   = unit === 'PAIR'  ? 'PAR'
                    : unit === 'LEFT'  ? 'Left'
                    : unit === 'RIGHT' ? 'Right'
                    : ''  // LEFT_RIGHT uses its own labels

  // Update a single field — handles mirror (PAIR) automatically
  const updateField = useCallback((key: string, side: 'l'|'r', value: unknown) => {
    const existing = additions[key] as SidedVal ?? { l: null, r: null }
    let next: SidedVal
    if (!isDouble) {
      // Single mode: PAIR writes both, LEFT writes l, RIGHT writes r
      next = unit === 'PAIR'
        ? { l: value, r: value }
        : { ...existing, [side]: value }
    } else {
      next = { ...existing, [side]: value }
    }
    onChange({ ...additions, [key]: next })
  }, [additions, onChange, unit, isDouble])

  const update = useCallback((key: string, side: 'l'|'r'|'global', value: unknown) => {
    if (side === 'global') { onChange({ ...additions, [key]: value }); return }
    updateField(key, side, value)
  }, [additions, onChange, updateField])

  // Is a conditional field's parent active?
  function isParentActive(field: AdditionField, side: 'l' | 'r'): boolean {
    if (!field.conditionalOn) return true
    const parent = additions[field.conditionalOn]
    if (parent === null || parent === undefined) return false
    if (typeof parent === 'boolean') return parent
    const sv = parent as SidedVal
    return !!(side === 'l' ? sv.l : sv.r)
  }

  function renderControl(field: AdditionField, side: 'l' | 'r', disabled = false) {
    const sv = additions[field.key] as SidedVal | null
    const val = sv?.[side] ?? null
    const setVal = (v: unknown) => updateField(field.key, side, v)

    if (disabled) {
      return <div className="opacity-40 pointer-events-none">{renderControl(field, 'l')}</div>
    }

    if (field.type === 'mm' || field.type === 'image')
      return <MmInput values={field.values ?? []} value={val} onChange={setVal} />
    if (field.type === 'option')
      return <OptionChips values={field.values ?? []} value={val} onChange={setVal} collapse={field.collapse} />
    if (field.type === 'toggle')
      return <YesNoToggle value={val === true} onChange={setVal} />
    if (field.type === 'text')
      return (
        <input type="text" value={String(val ?? '')}
          onChange={(e) => setVal(e.target.value || null)}
          className="w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
      )
    return null
  }

  function renderGlobal(field: AdditionField) {
    const val = additions[field.key] === true
    return (
      <div key={field.key} className="flex items-center justify-between py-2
           border-b border-stone-50 last:border-0">
        <span className="text-sm text-stone-700">{field.label.replace(/\s*\(mm\)/gi, '')}</span>
        <YesNoToggle value={val} onChange={(v) => update(field.key, 'global', v)} />
      </div>
    )
  }

  function toggleSection(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleAddField(key: string, side: 'l' | 'r', on: boolean) {
    if (on) {
      // When activating Right and Left already has a value, pre-fill Right
      if (side === 'r') {
        const leftVal = (additions[key] as SidedVal | null)?.l
        if (leftVal != null && leftVal !== '') updateField(key, 'r', leftVal)
      }
      setAddExpanded(prev => { const next = new Set(prev); next.add(`${key}:${side}`); return next })
    } else {
      updateField(key, side, null)
      setAddExpanded(prev => { const next = new Set(prev); next.delete(`${key}:${side}`); return next })
    }
  }

  // ── Reusable checkbox-expand render for additions / upper / sole ─────────────
  function renderCheckboxSection(
    section: AdditionSection, fields: AdditionField[], filled: number, open: boolean
  ) {
    const hasActive = fields.some(f =>
      f.side !== 'global' && (addExpanded.has(`${f.key}:l`) || addExpanded.has(`${f.key}:r`))
    )
    const effectiveFilter = (sectionFilter[section.key] ?? false) && hasActive
    const unitColLabel = unit === 'PAIR' ? 'PAR' : unit === 'LEFT' ? 'L' : unit === 'RIGHT' ? 'R' : ''

    return (
      <div key={section.key} className="border border-stone-100 rounded-xl overflow-hidden bg-white"
        style={{ boxShadow: 'var(--shadow-card)' }}>

        <button type="button" onClick={() => toggleSection(section.key)}
          className="w-full flex items-center justify-between px-5 py-3.5
                     hover:bg-stone-50 transition-colors text-left">
          <span className="font-semibold text-sm text-stone-800">{section.label}</span>
          <div className="flex items-center gap-2.5">
            {filled > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-gold/10
                               text-gold rounded-full flex items-center justify-center">
                {filled}
              </span>
            )}
            <svg className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {open && (
          <div className="px-5 pb-3 pt-1 border-t border-stone-100 divide-y divide-stone-50">

            {/* Sub-header: filter toggle + column labels */}
            <div className="flex items-center justify-between pb-2 pt-1.5">
              <button type="button" disabled={!hasActive}
                onClick={() => setSectionFilter(prev => ({ ...prev, [section.key]: !(prev[section.key]) }))}
                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md transition-all
                  ${effectiveFilter
                    ? 'bg-gold/10 text-gold'
                    : hasActive
                      ? 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
                      : 'text-stone-300 cursor-not-allowed'}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd"/>
                </svg>
                Selected
              </button>
              <div className="flex gap-5 pr-0.5">
                {isDouble ? (
                  <>
                    <span className="w-4 text-center text-[11px] font-semibold text-stone-400">L</span>
                    <span className="w-4 text-center text-[11px] font-semibold text-stone-400">R</span>
                  </>
                ) : (
                  <span className="w-4 text-center text-[11px] font-semibold text-stone-400">{unitColLabel}</span>
                )}
              </div>
            </div>

            {fields.map(field => {
              if (field.side === 'global') return renderGlobal(field)
              const isSubField = field.label.startsWith('↳')
              const cleanLabel = field.label.replace(/↳\s*/g, '').replace(/\s*\(mm\)/gi, '')

              // Active filter — top-level only (sub-fields follow parent)
              if (effectiveFilter && !isSubField) {
                const active = isDouble
                  ? (addExpanded.has(`${field.key}:l`) || addExpanded.has(`${field.key}:r`))
                  : addExpanded.has(`${field.key}:${displaySide}`)
                if (!active) return null
              }

              // Sub-fields: appear only when parent has a value (mandatory)
              if (isSubField) {
                if (!isDouble) {
                  if (!isParentActive(field, displaySide)) return null
                  return (
                    <div key={field.key} className="py-2 pl-4 ml-1 border-l-2 border-gold/20">
                      <p className="text-xs text-stone-400 mb-2">{cleanLabel} <span className="text-red-400">*</span></p>
                      {renderControl(field, displaySide)}
                    </div>
                  )
                } else {
                  const parentFilledL = isParentActive(field, 'l')
                  const parentFilledR = isParentActive(field, 'r')
                  if (!parentFilledL && !parentFilledR) return null
                  return (
                    <div key={field.key} className="py-2 pl-4 ml-1 border-l-2 border-gold/20">
                      <p className="text-xs text-stone-400 mb-2">{cleanLabel} <span className="text-red-400">*</span></p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>{parentFilledL ? renderControl(field, 'l') : null}</div>
                        <div>{parentFilledR ? renderControl(field, 'r') : null}</div>
                      </div>
                    </div>
                  )
                }
              }

              // Top-level: single checkbox or two checkboxes
              if (!isDouble) {
                if (field.conditionalOn && !isParentActive(field, displaySide)) return null
                const checked = addExpanded.has(`${field.key}:${displaySide}`)
                const glbFile = field.glb ? (displaySide === 'r' ? field.glb.r : field.glb.l) : null
                return (
                  <div key={field.key} className="py-2.5">
                    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                      <span className="text-sm text-stone-700">{cleanLabel}</span>
                      <input type="checkbox" checked={checked}
                        onChange={e => toggleAddField(field.key, displaySide, e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-stone-700 shrink-0" />
                    </label>
                    {checked && (
                      <>
                        <div className="mt-2.5 pl-1">{renderControl(field, displaySide)}</div>
                        {glbFile && <GlbViewer file={glbFile} />}
                      </>
                    )}
                  </div>
                )
              } else {
                const checkedL = addExpanded.has(`${field.key}:l`)
                const checkedR = addExpanded.has(`${field.key}:r`)
                const sv = additions[field.key] as SidedVal | null
                return (
                  <div key={field.key} className="py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-stone-700 min-w-0">{cleanLabel}</span>
                      <div className="flex gap-5 shrink-0">
                        <input type="checkbox" checked={checkedL}
                          onChange={e => toggleAddField(field.key, 'l', e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-stone-700" />
                        <input type="checkbox" checked={checkedR}
                          onChange={e => toggleAddField(field.key, 'r', e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-stone-700" />
                      </div>
                    </div>
                    {(checkedL || checkedR) && (
                      <div className="mt-2.5 grid grid-cols-2 gap-4">
                        <div>
                          {checkedL && field.type === 'mm' ? (
                            <MmInput values={field.values ?? []} value={sv?.l}
                              onChange={v => updateField(field.key, 'l', v)}
                              onBlurDone={v => {
                                if (checkedR && v != null) {
                                  const rVal = (additions[field.key] as SidedVal | null)?.r
                                  if (rVal == null || rVal === '') updateField(field.key, 'r', v)
                                }
                              }} />
                          ) : checkedL ? renderControl(field, 'l') : null}
                          {checkedL && field.glb && <GlbViewer file={field.glb.l} />}
                        </div>
                        <div>
                          {checkedR ? renderControl(field, 'r') : null}
                          {checkedR && field.glb && <GlbViewer file={field.glb.r} />}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {SECTIONS.map((section) => {
        const fields = filterExcluded(section.fields, addsExclude).filter(f => {
          // Hide closure-specific fields that don't match product closure
          if (f.closureOnly && f.closureOnly !== closure) return false
          return true
        })
        const filled = countFilled(additions, section.key)
        const open   = expanded.has(section.key)

        // ── Additions, Upper Adaptions, Sole & Heel: checkbox-expand pattern ─────
        if (['additions', 'upper', 'sole'].includes(section.key)) {
          return renderCheckboxSection(section, fields, filled, open)
        }

        return (
          <div key={section.key}
            className="border border-stone-100 rounded-xl overflow-hidden bg-white"
            style={{ boxShadow: 'var(--shadow-card)' }}>

            {/* Section header */}
            <button
              type="button"
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between px-5 py-3.5
                         hover:bg-stone-50 transition-colors text-left">
              <span className="font-semibold text-sm text-stone-800">{section.label}</span>
              <div className="flex items-center gap-2.5">
                {filled > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-gold/10
                                   text-gold rounded-full flex items-center justify-center">
                    {filled}
                  </span>
                )}
                <svg className={`w-4 h-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Section body */}
            {open && (
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-stone-100">
                {fields.map((field) => {
                  // Global fields (Others section)
                  if (field.side === 'global') return renderGlobal(field)

                  // Conditional: check if parent is active on at least one side
                  const leftActive  = isParentActive(field, 'l')
                  const rightActive = isParentActive(field, 'r')
                  if (!leftActive && !rightActive) return null

                  const isConditional = !!field.conditionalOn
                  const isSubField    = field.label.startsWith('↳')

                  return (
                    <div key={field.key}
                      className={`space-y-2 ${isSubField ? 'ml-4 pl-3 border-l-2 border-gold/20' : ''}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide
                                     ${isSubField ? 'text-gold/70' : 'text-slate-500'}`}>
                        {field.label.replace(/\s*\(mm\)/gi, '')}
                      </p>

                      {/* Lining experiment: SharedOptionPicker */}
                      {field.key === 'lining' && field.type === 'option' ? (
                        !isDouble ? (
                          // Single mode (PAR/Left/Right): just the options with foot label
                          <div className="space-y-1.5">
                            {sideLabel && <p className="text-[10px] text-stone-400 uppercase tracking-wide">{sideLabel}</p>}
                            <OptionChips
                              values={field.values ?? []}
                              value={(additions[field.key] as SidedVal)?.[displaySide]}
                              onChange={v => updateField(field.key, displaySide, v)}
                            />
                          </div>
                        ) : (
                          <SharedOptionPicker
                            options={(field.values ?? []).map(String)}
                            valueL={String((additions[field.key] as SidedVal)?.l ?? '')}
                            valueR={String((additions[field.key] as SidedVal)?.r ?? '')}
                            onChangeL={v => updateField(field.key, 'l', v)}
                            onChangeR={v => updateField(field.key, 'r', v)}
                          />
                        )
                      ) : field.closureOnly && field.type === 'option' ? (
                        /* Closure fields: chips in single mode, combos in LEFT_RIGHT */
                        !isDouble ? (
                          <div className="space-y-1.5">
                            {sideLabel && <p className="text-[10px] text-stone-400 uppercase tracking-wide">{sideLabel}</p>}
                            <OptionChips
                              values={field.values ?? []}
                              value={(additions[field.key] as SidedVal)?.[displaySide]}
                              onChange={v => updateField(field.key, displaySide, v)}
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            {leftActive && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-stone-400 uppercase tracking-wide">Left</p>
                                <SelectCombo
                                  values={field.values ?? []}
                                  value={(additions[field.key] as SidedVal)?.l}
                                  onChange={v => updateField(field.key, 'l', v)}
                                />
                              </div>
                            )}
                            {rightActive && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-stone-400 uppercase tracking-wide">Right</p>
                                <SelectCombo
                                  values={field.values ?? []}
                                  value={(additions[field.key] as SidedVal)?.r}
                                  onChange={v => updateField(field.key, 'r', v)}
                                />
                              </div>
                            )}
                          </div>
                        )
                      ) : !isDouble ? (
                        /* Single column (PAR / Left / Right) */
                        <div className="space-y-1">
                          {sideLabel && <p className="text-[10px] text-stone-400 uppercase tracking-wide">{sideLabel}</p>}
                          {renderControl(field, displaySide)}
                        </div>
                      ) : (
                        /* Two columns (LEFT_RIGHT) */
                        <div className="grid grid-cols-2 gap-4">
                          {leftActive && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-stone-400 uppercase tracking-wide">Left</p>
                              {renderControl(field, 'l')}
                            </div>
                          )}
                          {rightActive && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-stone-400 uppercase tracking-wide">Right</p>
                              {renderControl(field, 'r')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Comments */}
      <div className="space-y-2 pt-2">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Comments</p>
        <textarea
          rows={3}
          value={String(additions['comments'] ?? '')}
          onChange={(e) => onChange({ ...additions, comments: e.target.value || null })}
          placeholder="Additional notes..."
          className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                     resize-none transition-colors"
        />
      </div>
    </div>
  )
}
