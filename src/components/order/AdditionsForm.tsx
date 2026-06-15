'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SECTIONS, filterExcluded, isSectionExcluded, countFilled, type AdditionField, type AdditionSection, type MissingRequired } from './additions-config'
import { allowedSoleValues, soleFieldHidden } from './sole-profiles'
import { soleImages } from './sole-images'
import { GlbViewer } from './GlbViewer'
import { getFieldLabel, getSectionLabel, translateOptionValue } from '@/lib/additions-helpers'

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
  isNew?: boolean         // new order → start with all sections collapsed
  missing?: MissingRequired[]  // required children flagged empty on a failed advance
  soleProfile?: string | null  // sole group key for this model → restricts sole-amendment options
  section?: string | null      // product section (KIDS/MEN/WOMEN) → picks gender-specific sole photos
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
        value={value == null ? '' : `${String(value)} mm`}
        placeholder="mm"
        onChange={e => {
          const typed = e.target.value.replace(/ mm$/i, '')
          if (typed === '') { onChange(null); return }
          const allowed = strValues.some(v => v.startsWith(typed) || typed === v)
          if (allowed) onChange(typed)
        }}
        onBlur={e => {
          const typed = e.target.value.replace(/ mm$/i, '')
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
        onFocus={e => e.target.select()}
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
function SharedOptionPicker({ options, valueL, valueR, onChangeL, onChangeR, t, fieldKey }: {
  options: string[]
  valueL: string; valueR: string
  onChangeL: (v: string | null) => void
  onChangeR: (v: string | null) => void
  t: (key: string) => string
  fieldKey: string
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
          <span className="text-stone-500 font-bold">{t('left')}</span>
          <span className={`mx-1 truncate ${valueL ? 'text-stone-800' : 'text-stone-300'}`}>{valueL ? translateOptionValue(fieldKey, valueL, t) : t('empty_value')}</span>
          {valueL && (
            <span className="shrink-0 text-stone-300 hover:text-red-400 cursor-pointer"
              onClick={e => { e.stopPropagation(); onChangeL(null) }}>×</span>
          )}
        </button>

        <button type="button" onClick={() => setActive('r')}
          className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg border text-xs transition-all
            ${active === 'r' ? 'border-gold bg-gold/5 font-medium' : 'border-stone-200 hover:border-stone-300'}`}>
          <span className="text-stone-500 font-bold">{t('right')}</span>
          <span className={`mx-1 truncate ${valueR ? 'text-stone-800' : 'text-stone-300'}`}>{valueR ? translateOptionValue(fieldKey, valueR, t) : t('empty_value')}</span>
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
            {translateOptionValue(fieldKey, opt, t)}
          </button>
        ))}
      </div>
    </div>
  )
}

function OptionChips({ values, value, onChange, collapse = false, label }: {
  values: (number | string)[]
  value: unknown
  onChange: (v: string | null) => void
  collapse?: boolean
  label?: (v: string) => string
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
          {label ? label(String(v)) : v}
        </button>
      ))}
    </div>
  )
}

// Image picker — selectable diagram cards (used for the Rocker Sole type field)
function ImageChips({ values, value, onChange, images, label }: {
  values: (number | string)[]
  value: unknown
  onChange: (v: string | null) => void
  images: Record<string, string>
  label?: (v: string) => string
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {values.map((v) => {
        const key = String(v)
        const src = images[key]
        const selected = value === v
        const display = label ? label(key) : key
        return (
          <button key={key} type="button"
            onClick={() => onChange(selected ? null : key)}
            title={display}
            className={`group relative flex flex-col items-center w-[120px] rounded-lg border p-1.5 transition-all
              ${selected
                ? 'border-gold ring-2 ring-gold/30 bg-gold/5 shadow-sm'
                : 'border-stone-200 bg-white hover:border-gold/60'}`}>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={key}
                className="w-full h-[64px] object-contain pointer-events-none" />
            ) : (
              <div className="w-full h-[64px] flex items-center justify-center text-[10px] text-stone-300">—</div>
            )}
            <span className={`mt-1 text-[10px] leading-tight font-medium text-center
              ${selected ? 'text-gold' : 'text-stone-600'}`}>
              {display}
            </span>
            {selected && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gold text-white
                               flex items-center justify-center shadow-sm">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            {/* Enlarged preview on hover */}
            {src && (
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                               hidden group-hover:block">
                <span className="block rounded-lg border border-stone-200 bg-white p-2 shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={key} className="w-[260px] h-auto object-contain" />
                </span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Classic select dropdown — used for closure fields in LEFT_RIGHT mode
function SelectCombo({ values, value, onChange, t, fieldKey }: {
  values: (number | string)[]
  value: unknown
  onChange: (v: string | null) => void
  t: (key: string) => string
  fieldKey: string
}) {
  return (
    <div className="relative">
      <select
        value={String(value ?? '')}
        onChange={e => onChange(e.target.value || null)}
        className="w-full h-9 pl-3 pr-8 text-sm bg-stone-50 border border-stone-200 rounded-lg
                   appearance-none focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                   transition-colors text-stone-700">
        <option value="">{t('empty_value')}</option>
        {values.map(v => <option key={String(v)} value={String(v)}>{translateOptionValue(fieldKey, String(v), t)}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
      </svg>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdditionsForm({ unit, closure, addsExclude, additions, onChange, isNew, missing, soleProfile = null, section = null }: Props) {
  const t = useTranslations('additions')
  // Field keys flagged as missing-required on the last failed "Review and confirm".
  const missingKeys = new Set((missing ?? []).map(m => m.fieldKey))
  // New orders open fully collapsed so the whole structure is visible; once the
  // user navigates between tabs the chosen open/closed state is preserved.
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    isNew ? new Set<string>() : new Set(['additions']))

  // Per-section filter state (replaces single showOnlyActive)
  const [sectionFilter, setSectionFilter] = useState<Record<string, boolean>>({})

  // Sections containing a flagged-missing child — force-opened and unfiltered
  // (derived during render, so no setState-in-effect cascade) so the user lands
  // directly on the empty required fields.
  const missingSections = new Set((missing ?? []).map(m => m.sectionKey))

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

    if (field.type === 'mm')
      return <MmInput values={field.values ?? []} value={val} onChange={setVal} />
    // Sole-amendment option fields: restrict to the model's profile (full list if unprofiled).
    const optVals = allowedSoleValues(soleProfile, field.key, (field.values ?? []) as string[])
    if (field.type === 'image' && field.images)
      return <ImageChips values={optVals} value={val} onChange={setVal} images={field.images}
        label={(v) => translateOptionValue(field.key, v, t)} />
    if (field.type === 'image' || field.type === 'option') {
      // Sole swatches: for profiled models, show photo cards when we have images for the
      // restricted set; otherwise fall back to text chips (keeps unprofiled models unchanged).
      const swatch = soleProfile ? soleImages(field.key, section) : {}
      if ((optVals as string[]).some(v => swatch[v]))
        return <ImageChips values={optVals} value={val} onChange={setVal} images={swatch}
          label={(v) => translateOptionValue(field.key, v, t)} />
      return <OptionChips values={optVals} value={val} onChange={setVal} collapse={field.collapse}
        label={(v) => translateOptionValue(field.key, v, t)} />
    }
    if (field.type === 'toggle')
      return null  // Toggles are now handled as checkboxes at the field level, not in renderControl
    if (field.type === 'text')
      return (
        <input type="text" value={String(val ?? '')}
          onChange={(e) => setVal(e.target.value || null)}
          onFocus={(e) => e.target.select()}
          className="w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
      )
    return null
  }

  function renderGlobal(field: AdditionField) {
    const val = additions[field.key] === true
    return (
      <div key={field.key} className="flex items-center gap-3 py-2
           border-b border-stone-50 last:border-0">
        <input type="checkbox" checked={val}
          onChange={(e) => update(field.key, 'global', e.target.checked)}
          className="w-4 h-4 cursor-pointer custom-gold shrink-0" />
        <span
          onClick={() => update(field.key, 'global', !val)}
          className="text-sm text-stone-700 cursor-pointer flex-1">
          {getFieldLabel(field, t).replace(/\s*\(mm\)/gi, '')}
        </span>
      </div>
    )
  }

  function toggleSection(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
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
    const effectiveFilter = (sectionFilter[section.key] ?? false) && hasActive && !missingSections.has(section.key)
    const unitColLabel = unit === 'PAIR' ? 'PAR' : unit === 'LEFT' ? 'L' : unit === 'RIGHT' ? 'R' : ''

    return (
      <div key={section.key} className="border border-stone-100 rounded-xl overflow-hidden bg-white"
        style={{ boxShadow: 'var(--shadow-card)' }}>

        <button type="button" onClick={() => toggleSection(section.key)}
          className="w-full flex items-center justify-between px-5 py-3.5
                     hover:bg-stone-50 transition-colors text-left">
          <span className="font-semibold text-sm text-stone-800">{getSectionLabel(section, t)}</span>
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

            {/* Sub-header: column labels + filter toggle */}
            <div className="flex items-center justify-between pb-2 pt-1.5">
              <div className="flex gap-5">
                {isDouble ? (
                  <>
                    <span className="w-4 text-center text-[11px] font-semibold text-stone-400">{t('left_short')}</span>
                    <span className="w-4 text-center text-[11px] font-semibold text-stone-400">{t('right_short')}</span>
                  </>
                ) : (
                  <span className="w-4 text-center text-[11px] font-semibold text-stone-400">{unitColLabel}</span>
                )}
              </div>
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
                {t('selected')}
              </button>
            </div>

            {fields.map(field => {
              if (field.side === 'global') return renderGlobal(field)
              // Hidden by the model's sole profile (controlled field or its parent toggle).
              if (soleFieldHidden(soleProfile, field.key, (field.values ?? []) as string[])) return null
              const fieldLabel = getFieldLabel(field, t)
              const isSubField = fieldLabel.startsWith('↳')
              const cleanLabel = fieldLabel.replace(/↳\s*/g, '').replace(/\s*\(mm\)/gi, '')

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
                  const flagged = missingKeys.has(field.key)
                  return (
                    <div key={field.key} className={`py-2 pl-4 ml-1 border-l-2 ${flagged ? 'border-red-400' : 'border-gold/20'}`}>
                      <p className={`text-xs mb-2 ${flagged ? 'text-red-500 font-medium' : 'text-stone-400'}`}>{cleanLabel} <span className="text-red-400">*</span></p>
                      {renderControl(field, displaySide)}
                    </div>
                  )
                } else {
                  const parentFilledL = isParentActive(field, 'l')
                  const parentFilledR = isParentActive(field, 'r')
                  if (!parentFilledL && !parentFilledR) return null
                  const flagged = missingKeys.has(field.key)
                  return (
                    <div key={field.key} className={`py-2 pl-4 ml-1 border-l-2 ${flagged ? 'border-red-400' : 'border-gold/20'}`}>
                      <p className={`text-xs mb-2 ${flagged ? 'text-red-500 font-medium' : 'text-stone-400'}`}>{cleanLabel} <span className="text-red-400">*</span></p>
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
                const isChild = !!field.conditionalOn

                // Special handling for toggle fields
                if (field.type === 'toggle') {
                  const sv = additions[field.key] as SidedVal | null
                  const isChecked = sv?.[displaySide] === true

                  return (
                    <div key={field.key} className={`py-2.5 ${isChild ? 'ml-6' : ''}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span
                          onClick={() => {
                            updateField(field.key, displaySide, !isChecked)
                          }}
                          className="text-sm text-stone-700 cursor-pointer flex-1">
                          {cleanLabel}
                        </span>
                        <input type="checkbox" checked={isChecked}
                          onChange={e => updateField(field.key, displaySide, e.target.checked)}
                          className="w-4 h-4 cursor-pointer custom-gold shrink-0" />
                      </div>
                      {/* Children are rendered separately as sub-fields when parent is active */}
                    </div>
                  )
                }

                // Non-toggle fields: use expand/collapse logic
                const checked = addExpanded.has(`${field.key}:${displaySide}`)
                const hasGlb = !!field.glb
                return (
                  <div key={field.key} className={`py-2.5 ${isChild ? 'ml-6' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span
                        onClick={() => {
                          // Toggle expand/collapse without affecting checkbox value
                          if (checked) {
                            setAddExpanded(prev => {
                              const next = new Set(prev)
                              const k = `${field.key}:${displaySide}`
                              if (next.has(k)) next.delete(k); else next.add(k)
                              return next
                            })
                          } else {
                            // If not checked, check it and expand
                            toggleAddField(field.key, displaySide, true)
                          }
                        }}
                        className="text-sm text-stone-700 cursor-pointer flex-1">
                        {cleanLabel}
                      </span>
                      <input type="checkbox" checked={checked}
                        onChange={e => toggleAddField(field.key, displaySide, e.target.checked)}
                        className="w-4 h-4 cursor-pointer custom-gold shrink-0" />
                    </div>
                    {checked && (
                      <div className="mt-2.5 pl-7 flex flex-wrap items-start gap-2">
                        <div className="flex-1 min-w-[140px]">{renderControl(field, displaySide)}</div>
                        {hasGlb && unit === 'PAIR' && (
                          <div className="flex gap-2 shrink-0">
                            <GlbViewer file={field.glb!.l} inline />
                            <GlbViewer file={field.glb!.r} inline />
                          </div>
                        )}
                        {hasGlb && unit !== 'PAIR' && (
                          <GlbViewer file={displaySide === 'r' ? field.glb!.r : field.glb!.l} inline />
                        )}
                      </div>
                    )}
                  </div>
                )
              } else {
                // LEFT_RIGHT mode: two checkboxes
                const sv = additions[field.key] as SidedVal | null
                const isChild = !!field.conditionalOn

                // Special handling for toggle fields
                if (field.type === 'toggle') {
                  const isCheckedL = sv?.l === true
                  const isCheckedR = sv?.r === true

                  return (
                    <div key={field.key} className={`py-2.5 ${isChild ? 'ml-6' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-5 shrink-0">
                          <input type="checkbox" checked={isCheckedL}
                            onChange={e => updateField(field.key, 'l', e.target.checked)}
                            className="w-4 h-4 cursor-pointer custom-gold" />
                          <input type="checkbox" checked={isCheckedR}
                            onChange={e => updateField(field.key, 'r', e.target.checked)}
                            className="w-4 h-4 cursor-pointer custom-gold" />
                        </div>
                        <span
                          onClick={() => {
                            const newValue = !(isCheckedL || isCheckedR)
                            const current = additions[field.key] as SidedVal || { l: false, r: false }
                            onChange({ ...additions, [field.key]: { ...current, l: newValue, r: newValue } })
                          }}
                          className="flex-1 text-sm text-stone-700 min-w-0 cursor-pointer">
                          {cleanLabel}
                        </span>
                      </div>
                      {/* Children are rendered separately as sub-fields when parent is active */}
                    </div>
                  )
                }

                // Non-toggle fields: use expand/collapse logic
                const checkedL = addExpanded.has(`${field.key}:l`)
                const checkedR = addExpanded.has(`${field.key}:r`)
                const hasGlb = !!field.glb
                return (
                  <div key={field.key} className={`py-2.5 ${isChild ? 'ml-6' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-5 shrink-0">
                        <input type="checkbox" checked={checkedL}
                          onChange={e => toggleAddField(field.key, 'l', e.target.checked)}
                          className="w-4 h-4 cursor-pointer custom-gold" />
                        <input type="checkbox" checked={checkedR}
                          onChange={e => toggleAddField(field.key, 'r', e.target.checked)}
                          className="w-4 h-4 cursor-pointer custom-gold" />
                      </div>
                      <span
                        onClick={() => {
                          // If both unchecked, check both and expand
                          if (!checkedL && !checkedR) {
                            toggleAddField(field.key, 'l', true)
                            toggleAddField(field.key, 'r', true)
                          } else {
                            // If at least one checked, just toggle expand/collapse
                            setAddExpanded(prev => {
                              const next = new Set(prev)
                              const hasL = next.has(`${field.key}:l`)
                              const hasR = next.has(`${field.key}:r`)
                              // Toggle based on current state
                              if (hasL || hasR) {
                                next.delete(`${field.key}:l`)
                                next.delete(`${field.key}:r`)
                              } else {
                                if (checkedL) next.add(`${field.key}:l`)
                                if (checkedR) next.add(`${field.key}:r`)
                              }
                              return next
                            })
                          }
                        }}
                        className="flex-1 text-sm text-stone-700 min-w-0 cursor-pointer">
                        {cleanLabel}
                      </span>
                    </div>
                    {(checkedL || checkedR) && (
                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-4 pl-[calc(2rem+1.25rem+0.75rem)]">
                        <div className="flex flex-wrap items-start gap-2">
                          <div className="flex-1 min-w-[120px]">
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
                          </div>
                          {checkedL && hasGlb && <GlbViewer file={field.glb!.l} inline />}
                        </div>
                        <div className="flex flex-wrap items-start gap-2">
                          <div className="flex-1 min-w-[120px]">
                            {checkedR ? renderControl(field, 'r') : null}
                          </div>
                          {checkedR && hasGlb && <GlbViewer file={field.glb!.r} inline />}
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
        // Whole section excluded for this product (e.g. #cr56f_checkboxsection6)
        if (isSectionExcluded(section.key, addsExclude)) return null
        const fields = filterExcluded(section.fields, addsExclude).filter(f => {
          // Hide closure-specific fields that don't match product closure
          if (f.closureOnly && f.closureOnly !== closure) return false
          return true
        })
        // Nothing left to show (every field excluded) → drop the section header too
        if (fields.length === 0) return null
        const filled = countFilled(additions, section.key)
        const open   = expanded.has(section.key) || missingSections.has(section.key)

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
              <span className="font-semibold text-sm text-stone-800">{getSectionLabel(section, t)}</span>
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

                  // Toggle fields with side: 'both' - show as checkbox for L/R
                  if (field.type === 'toggle') {
                    const sv = additions[field.key] as SidedVal | null
                    const fieldLabel = getFieldLabel(field, t)

                    if (!isDouble) {
                      // PAIR/LEFT/RIGHT: single checkbox
                      const isChecked = sv?.[displaySide] === true
                      return (
                        <div key={field.key} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                          <span
                            onClick={() => updateField(field.key, displaySide, !isChecked)}
                            className="text-sm text-stone-700 cursor-pointer flex-1">
                            {fieldLabel}
                          </span>
                          <input type="checkbox" checked={isChecked}
                            onChange={e => updateField(field.key, displaySide, e.target.checked)}
                            className="w-4 h-4 cursor-pointer custom-gold shrink-0" />
                        </div>
                      )
                    } else {
                      // LEFT_RIGHT: two checkboxes
                      const isCheckedL = sv?.l === true
                      const isCheckedR = sv?.r === true
                      return (
                        <div key={field.key} className="py-2 border-b border-stone-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-5 shrink-0">
                              <input type="checkbox" checked={isCheckedL}
                                onChange={e => updateField(field.key, 'l', e.target.checked)}
                                className="w-4 h-4 cursor-pointer custom-gold" />
                              <input type="checkbox" checked={isCheckedR}
                                onChange={e => updateField(field.key, 'r', e.target.checked)}
                                className="w-4 h-4 cursor-pointer custom-gold" />
                            </div>
                            <span
                              onClick={() => {
                                // If both unchecked, check both; otherwise uncheck both
                                const newValue = !(isCheckedL || isCheckedR)
                                const current = additions[field.key] as SidedVal || { l: false, r: false }
                                onChange({ ...additions, [field.key]: { ...current, l: newValue, r: newValue } })
                              }}
                              className="flex-1 text-sm text-stone-700 cursor-pointer">
                              {fieldLabel}
                            </span>
                          </div>
                        </div>
                      )
                    }
                  }

                  // Non-toggle sided fields
                  const leftActive  = isParentActive(field, 'l')
                  const rightActive = isParentActive(field, 'r')
                  if (!leftActive && !rightActive) return null

                  const fieldLabel = getFieldLabel(field, t)
                  const isSubField = fieldLabel.startsWith('↳')

                  return (
                    <div key={field.key}
                      className={`space-y-2 ${isSubField ? 'ml-4 pl-3 border-l-2 border-gold/20' : ''}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide
                                     ${isSubField ? 'text-gold/70' : 'text-slate-500'}`}>
                        {fieldLabel.replace(/\s*\(mm\)/gi, '')}
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
                              label={(v) => translateOptionValue(field.key, v, t)}
                            />
                          </div>
                        ) : (
                          <SharedOptionPicker
                            fieldKey={field.key}
                            options={(field.values ?? []).map(String)}
                            valueL={String((additions[field.key] as SidedVal)?.l ?? '')}
                            valueR={String((additions[field.key] as SidedVal)?.r ?? '')}
                            onChangeL={v => updateField(field.key, 'l', v)}
                            onChangeR={v => updateField(field.key, 'r', v)}
                            t={t}
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
                              label={(v) => translateOptionValue(field.key, v, t)}
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            {leftActive && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-stone-400 uppercase tracking-wide">{t('left')}</p>
                                <SelectCombo
                                  fieldKey={field.key}
                                  values={field.values ?? []}
                                  value={(additions[field.key] as SidedVal)?.l}
                                  onChange={v => updateField(field.key, 'l', v)}
                                  t={t}
                                />
                              </div>
                            )}
                            {rightActive && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-stone-400 uppercase tracking-wide">{t('right')}</p>
                                <SelectCombo
                                  fieldKey={field.key}
                                  values={field.values ?? []}
                                  value={(additions[field.key] as SidedVal)?.r}
                                  onChange={v => updateField(field.key, 'r', v)}
                                  t={t}
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
                              <p className="text-[10px] text-stone-400 uppercase tracking-wide">{t('left')}</p>
                              {renderControl(field, 'l')}
                            </div>
                          )}
                          {rightActive && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-stone-400 uppercase tracking-wide">{t('right')}</p>
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
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{t('fields.comments')}</p>
        <textarea
          rows={3}
          value={String(additions['comments'] ?? '')}
          onChange={(e) => onChange({ ...additions, comments: e.target.value || null })}
          placeholder={t('comments_placeholder')}
          className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                     resize-none transition-colors"
        />
      </div>
    </div>
  )
}
