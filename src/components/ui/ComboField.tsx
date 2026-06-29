'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ComboField — sibling of RangeField for a CHOICE from a list. Instead of laying
// every chip inline (which floods a dense panel when there are many options), it
// shows a compact field with the current choice and pops the chips in a FLOATING
// panel (portal → never clipped) only while focused. Same interaction language as
// RangeField. Lab-only for now (page /lab/combo-lists).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function ComboField({
  options, value, onChange, placeholder = 'Selecionar…',
}: {
  options: string[]
  value: string | null
  onChange: (v: string | null) => void
  placeholder?: string
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const reposition = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom, left: r.left, width: r.width })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, reposition])

  const flip = pos ? (typeof window !== 'undefined' && window.innerHeight - pos.top < 180) : false

  // Harmonised grid: ≤3 → single row; otherwise a near-square (ceil√n columns),
  // so 4→2×2, 5→3+2, 6→3+3, 9→3×3, 18→5 cols, etc.
  const cols = options.length <= 3 ? options.length : Math.ceil(Math.sqrt(options.length))

  function pick(opt: string) {
    onChange(value === opt ? null : opt)
    setOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef} type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 min-w-[180px] h-9 px-3 text-sm bg-stone-50 border rounded-lg
          ${open ? 'border-gold ring-2 ring-gold/30' : 'border-stone-200 hover:border-stone-300'}`}
      >
        <span className={value ? 'text-stone-800' : 'text-stone-400'}>{value ?? placeholder}</span>
        <svg className={`w-3.5 h-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          style={{
            position: 'fixed', left: pos.left,
            width: Math.min(Math.max(cols * 120, pos.width, 200), 560),
            ...(flip ? { bottom: window.innerHeight - pos.top + 36 } : { top: pos.top + 8 }),
            boxShadow: 'var(--shadow-card)',
          }}
          className="z-[60] bg-white border border-stone-200 rounded-xl p-3 max-h-72 overflow-y-auto"
        >
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {options.map(opt => {
              const on = value === opt
              return (
                <button key={opt} type="button" onClick={() => pick(opt)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border transition-all text-center
                    ${on ? 'border-gold bg-gold/10 text-gold' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
