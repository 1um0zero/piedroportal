'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SECTIONS, filterExcluded, countFilled, type AdditionField } from './additions-config'

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
function MmInput({ values, value, onChange }: {
  values: (number | string)[]
  value: unknown
  onChange: (v: number | string | null) => void
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
        onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
        onBlur={e => {
          const v = parseFloat(e.target.value)
          if (isNaN(v) || e.target.value === '') { onChange(null); return }
          const nearest = strValues.reduce((p, c) =>
            Math.abs(parseFloat(c) - v) < Math.abs(parseFloat(p) - v) ? c : p
          )
          onChange(parseFloat(nearest))
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

function OptionChips({ values, value, onChange }: {
  values: (number | string)[]
  value: unknown
  onChange: (v: string | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
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

  const showLeft  = unit !== 'RIGHT'
  const showRight = unit !== 'LEFT'
  const mirror    = unit === 'PAIR'

  // Update helper
  const update = useCallback((key: string, side: 'l' | 'r' | 'global', value: unknown) => {
    onChange({
      ...additions,
      [key]: side === 'global'
        ? value
        : { ...(additions[key] as SidedVal ?? { l: null, r: null }), [side]: value },
    })
  }, [additions, onChange])

  function handleLeft(key: string, value: unknown) {
    if (mirror) {
      onChange({
        ...additions,
        [key]: { l: value, r: value },
      })
    } else {
      update(key, 'l', value)
    }
  }

  // Is a conditional field's parent active (for left or right)?
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
    const setVal = (v: unknown) => side === 'l' ? handleLeft(field.key, v) : update(field.key, 'r', v)

    if (disabled) {
      return <div className="opacity-40 pointer-events-none">{renderControl(field, 'l')}</div>
    }

    if (field.type === 'mm' || field.type === 'image')
      return <MmInput values={field.values ?? []} value={val} onChange={setVal} />
    if (field.type === 'option')
      return <OptionChips values={field.values ?? []} value={val} onChange={setVal} />
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
                                     ${isSubField ? 'text-gold/70' : 'text-stone-500'}`}>
                        {field.label.replace(/\s*\(mm\)/gi, '')}
                      </p>

                      {/* Sided fields */}
                      <div className={`grid gap-4 ${showLeft && showRight ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {showLeft && leftActive && (
                          <div className="space-y-1">
                            {showRight && (
                              <p className="text-[10px] text-stone-400 uppercase tracking-wide">Left</p>
                            )}
                            {renderControl(field, 'l')}
                          </div>
                        )}
                        {showRight && rightActive && (
                          <div className="space-y-1">
                            {showLeft && (
                              <p className="text-[10px] text-stone-400 uppercase tracking-wide">
                                Right {mirror ? <span className="normal-case text-stone-300">= Left</span> : ''}
                              </p>
                            )}
                            {renderControl(field, 'r', mirror)}
                          </div>
                        )}
                      </div>
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
