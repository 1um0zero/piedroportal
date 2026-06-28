'use client'

// ─────────────────────────────────────────────────────────────────────────────
// RangeField — the project's standard input for a NUMERIC field with a defined
// RANGE (a fixed list of allowed values). Layout: a small text field, then the
// unit of measure (when any) and the range in parentheses, e.g.  [ 20 ] mm (0–60).
//
// Delight + touch utility: a slider appears FLOATING (in a portal, so it is never
// clipped by a collapsed section's overflow) only while the field is focused. On
// coarse pointers the field is read-only so tapping it opens the slider WITHOUT
// raising the on-screen keyboard. The slider steps through the actual allowed
// values (which are not always evenly spaced — e.g. [4,6,8,10]).
//
// SUGESTÃO PÉTREA (não pétria): adoptar este widget para todos os campos numéricos
// com range e label de unidade, no projeto e como sugestão à Fundação.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function RangeField({
  values, value, onChange, onBlurDone, unit = 'mm',
}: {
  values: (number | string)[]
  value: unknown
  onChange: (v: number | string | null) => void
  onBlurDone?: (v: number | string | null) => void
  /** Unit of measure shown after the field; '' to hide. */
  unit?: string
}) {
  const strValues = values.map(String)
  const nums = values.map(Number)
  const min = nums.length ? nums[0] : 0
  const max = nums.length ? nums[nums.length - 1] : 0

  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [touch, setTouch] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTouch(typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)
  }, [])

  const snapNearest = useCallback((raw: number) => {
    const v = Math.max(min, Math.min(max, raw))
    return nums.reduce((p, c) => (Math.abs(c - v) < Math.abs(p - v) ? c : p), nums[0] ?? 0)
  }, [min, max, nums])

  const nearestIndex = useCallback((v: number) => {
    let bi = 0
    for (let i = 1; i < nums.length; i++) if (Math.abs(nums[i] - v) < Math.abs(nums[bi] - v)) bi = i
    return bi
  }, [nums])

  const isPrefix = (t: string) => strValues.some(v => v.startsWith(t) || v === t)

  const close = useCallback(() => {
    setOpen(false)
    if (value != null) onBlurDone?.(value as number | string)
  }, [value, onBlurDone])

  // Position the floating popover from the field's rect (fixed → never clipped).
  const reposition = useCallback(() => {
    const r = inputRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom, left: r.left, width: r.width })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!wrapRef.current?.contains(t) && !popRef.current?.contains(t)) close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); inputRef.current?.blur() } }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, reposition, close])

  const curNum = value == null ? null : Number(value)
  const idx = curNum == null ? 0 : nearestIndex(curNum)
  const pct = nums.length > 1 ? (idx / (nums.length - 1)) * 100 : 0
  // Flip above when there isn't room below.
  const flip = pos ? (typeof window !== 'undefined' && window.innerHeight - pos.top < 110) : false

  return (
    <div ref={wrapRef} className="relative inline-flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="text" inputMode={touch ? 'none' : 'numeric'} readOnly={touch}
        value={value == null ? '' : String(value)}
        placeholder={unit || undefined}
        onFocus={e => { e.currentTarget.select(); setOpen(true) }}
        onChange={e => {
          if (touch) return
          const t = e.target.value.trim()
          if (t === '') { onChange(null); return }
          if (isPrefix(t)) onChange(t)
        }}
        onBlur={e => {
          if (touch) return
          const t = e.target.value.trim()
          if (!t || isNaN(Number(t))) { onChange(null); onBlurDone?.(null); return }
          const n = snapNearest(Number(t)); onChange(n); onBlurDone?.(n)
        }}
        className="w-16 h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg text-center cursor-pointer
                   focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
      />
      {unit && <span className="text-sm text-stone-400">{unit}</span>}
      {nums.length > 0 && <span className="text-xs text-stone-300">({min}–{max})</span>}

      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          style={{
            position: 'fixed', left: pos.left, width: Math.max(pos.width, 200),
            ...(flip ? { bottom: window.innerHeight - pos.top + 36 } : { top: pos.top + 8 }),
            boxShadow: 'var(--shadow-card)',
          }}
          className="z-[60] bg-white border border-stone-200 rounded-xl p-3"
        >
          <input
            type="range" min={0} max={Math.max(nums.length - 1, 0)} step={1} autoFocus={touch}
            value={idx}
            onChange={e => onChange(nums[Number(e.target.value)])}
            className="w-full accent-gold cursor-pointer"
            style={{ background: `linear-gradient(to right, #B8975A ${pct}%, #e7e5e4 ${pct}%)` }}
          />
          <div className="flex justify-between text-[10px] text-stone-400 mt-1">
            <span>{min}{unit && ` ${unit}`}</span>
            <span className="font-semibold text-gold">{value == null ? '—' : `${value}${unit ? ` ${unit}` : ''}`}</span>
            <span>{max}{unit && ` ${unit}`}</span>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
