'use client'

// ─────────────────────────────────────────────────────────────────────────────
// LAB widgets · candidate inputs for the orthopedic "mm" fields (range 0–60).
// Shared by the playground (/lab/mm-fields) and by approval sheets so both use
// a single source of truth. Each export is a self-contained interactive demo —
// no verdict logic lives here.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'

export const MM_MIN = 0
export const MM_MAX = 60
export const MM_STEP = 1
const allowed = Array.from({ length: (MM_MAX - MM_MIN) / MM_STEP + 1 }, (_, i) => MM_MIN + i * MM_STEP)

export function clampSnap(raw: number): number {
  const v = Math.max(MM_MIN, Math.min(MM_MAX, raw))
  return allowed.reduce((p, c) => (Math.abs(c - v) < Math.abs(p - v) ? c : p))
}

const isPrefix = (t: string) => allowed.some(v => String(v).startsWith(t) || String(v) === t)

// ── Variant B — slider + number (recommended) ─────────────────────────────────
export function MmSlider() {
  const [value, setValue] = useState<number | null>(20)
  const pct = value == null ? 0 : ((value - MM_MIN) / (MM_MAX - MM_MIN)) * 100
  return (
    <div className="flex items-center gap-4 w-full max-w-md">
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="text" inputMode="numeric"
          value={value == null ? '' : String(value)}
          onChange={e => { const t = e.target.value.trim(); if (t === '') return setValue(null); if (isPrefix(t)) setValue(Number(t)) }}
          onBlur={e => { const t = e.target.value.trim(); setValue(t === '' || isNaN(Number(t)) ? null : clampSnap(Number(t))) }}
          onFocus={e => e.target.select()}
          className="w-16 h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg text-center
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
        />
        <span className="text-sm text-stone-400">mm</span>
      </div>
      <div className="flex-1">
        <input
          type="range" min={MM_MIN} max={MM_MAX} step={MM_STEP}
          value={value ?? MM_MIN}
          onChange={e => setValue(Number(e.target.value))}
          className="w-full accent-gold cursor-pointer"
          style={{ background: `linear-gradient(to right, #B8975A ${pct}%, #e7e5e4 ${pct}%)` }}
        />
        <div className="flex justify-between text-[10px] text-stone-400 mt-1">
          <span>{MM_MIN} mm</span><span>{MM_MAX} mm</span>
        </div>
      </div>
    </div>
  )
}

// ── Variant D — input + range hint (minimal) ──────────────────────────────────
export function MmHint() {
  const [value, setValue] = useState<number | null>(20)
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text" inputMode="numeric"
        value={value == null ? '' : String(value)}
        onChange={e => { const t = e.target.value.trim(); if (t === '') return setValue(null); if (isPrefix(t)) setValue(Number(t)) }}
        onBlur={e => { const t = e.target.value.trim(); setValue(t === '' || isNaN(Number(t)) ? null : clampSnap(Number(t))) }}
        onFocus={e => e.target.select()}
        className="w-16 h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg text-center
                   focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
      />
      <span className="text-sm text-stone-400">mm</span>
      <span className="text-xs text-stone-300 ml-2">{MM_MIN}–{MM_MAX}</span>
    </div>
  )
}

// ── Variant C — stepper (▲▼ + clamp) ──────────────────────────────────────────
export function MmStepper() {
  const [value, setValue] = useState<number | null>(20)
  const step = (d: number) => setValue(v => clampSnap((v ?? 0) + d))
  return (
    <div className="flex items-center gap-1.5">
      <div className="inline-flex items-center h-9 bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
        <button type="button" onClick={() => step(-MM_STEP)}
          className="w-9 h-full text-stone-500 hover:bg-stone-100 hover:text-gold text-lg leading-none">−</button>
        <input
          type="text" inputMode="numeric"
          value={value == null ? '' : String(value)}
          onChange={e => { const t = e.target.value.trim(); if (t === '') return setValue(null); if (isPrefix(t)) setValue(Number(t)) }}
          onBlur={e => { const t = e.target.value.trim(); setValue(t === '' || isNaN(Number(t)) ? null : clampSnap(Number(t))) }}
          onFocus={e => e.target.select()}
          className="w-12 h-full text-sm bg-transparent text-center focus:outline-none"
        />
        <button type="button" onClick={() => step(MM_STEP)}
          className="w-9 h-full text-stone-500 hover:bg-stone-100 hover:text-gold text-lg leading-none">+</button>
      </div>
      <span className="text-sm text-stone-400">mm</span>
    </div>
  )
}

// ── Variant A — current: input + <datalist> (the "linguiça") ──────────────────
export function MmDatalist() {
  const [value, setValue] = useState<number | null>(20)
  return (
    <div className="relative">
      <input
        list="lab-mm-datalist" type="text" inputMode="numeric"
        value={value == null ? '' : `${String(value)} mm`}
        placeholder="mm"
        onChange={e => { const t = e.target.value.replace(/ mm$/i, ''); if (t === '') return setValue(null); if (isPrefix(t)) setValue(Number(t)) }}
        onBlur={e => { const t = e.target.value.replace(/ mm$/i, ''); setValue(t === '' || isNaN(Number(t)) ? null : clampSnap(Number(t))) }}
        onFocus={e => e.target.select()}
        className="w-24 h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg text-center
                   focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
      />
      <datalist id="lab-mm-datalist">
        {allowed.map(v => <option key={v} value={v} />)}
      </datalist>
    </div>
  )
}
