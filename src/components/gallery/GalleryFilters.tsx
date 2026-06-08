'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import type { Locale } from '@/types'
import { translateFilterValueSync } from '@/lib/filter-translations'
import { displayWidth } from '@/lib/width-display'
import type { Filters } from './GalleryPage'

type Props = {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  optClosures: string[]
  optTypes: string[]
  optColours: string[]
  optConstructions: string[]
  optWidths: string[]
  optSizes: number[]
  hasNew: boolean
  hasFilters: boolean
  onClear: () => void
  resultCount: number
  wishlistCount: number
  showWishlist: boolean
  onToggleBuildWishlist: () => void
}

// ── Size range buckets ────────────────────────────────────────────────────────
function buildSizeBuckets(sizes: number[]): { label: string; values: number[] }[] {
  if (!sizes.length) return []
  const min = sizes[0]
  const max = sizes[sizes.length - 1]
  const span = max - min

  // Pick a sensible step for the range labels
  const step = span > 20 ? 4 : span > 10 ? 3 : 2

  const buckets: { label: string; values: number[] }[] = []
  for (let lo = min; lo <= max; lo += step) {
    const hi = Math.min(lo + step - 0.5, max)
    const vals = sizes.filter((s) => s >= lo && s <= hi)
    if (vals.length) {
      const label = lo === hi || vals.length === 1
        ? String(vals[0])
        : `${vals[0]}–${vals[vals.length - 1]}`
      buckets.push({ label, values: vals })
    }
  }
  return buckets
}

// ── Flat square chip (for constructions) ──────────────────────────────────────
function SquareChips({
  label,
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  renderLabel?: (v: string) => string
}) {
  if (!options.length) return null
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 text-xs font-medium text-stone-400 uppercase tracking-wide pt-1.5 w-24">
        {label}
      </span>
      {/* grid: all cells same width — auto-fill with min 100px */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', width: '100%' }}>
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={`py-1.5 text-xs font-medium rounded border text-center transition-all duration-150
              ${selected.includes(o)
                ? 'bg-gold text-white border-gold shadow-sm'
                : 'text-stone-600 border-stone-200 hover:border-gold/60 hover:text-gold bg-white'}`}
          >
            {renderLabel ? renderLabel(o) : o}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Pill chips (for widths) ───────────────────────────────────────────────────
function PillChips({
  label,
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  renderLabel?: (v: string) => string
}) {
  if (!options.length) return null
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 text-xs font-medium text-stone-400 uppercase tracking-wide pt-1.5 w-24">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={`w-9 h-9 text-xs font-semibold rounded-full border transition-all duration-150
              ${selected.includes(o)
                ? 'bg-gold text-white border-gold shadow-sm'
                : 'text-stone-600 border-stone-200 hover:border-gold/60 hover:text-gold bg-white'}`}
          >
            {renderLabel ? renderLabel(o) : o}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Size range chips + custom input ──────────────────────────────────────────
function SizeChips({
  label,
  sizes,
  selected,
  onToggleBucket,
}: {
  label: string
  sizes: number[]
  selected: number[]
  onToggleBucket: (vals: number[]) => void
}) {
  const [custom, setCustom] = useState('')
  const buckets = buildSizeBuckets(sizes)
  if (!buckets.length) return null

  // Sizes selected that don't belong to any bucket (manually typed)
  const bucketVals = new Set(buckets.flatMap(b => b.values))
  const customSelected = selected.filter(s => !bucketVals.has(s))

  const min = sizes[0]
  const max = sizes[sizes.length - 1]

  function submitCustom() {
    const v = parseFloat(custom.replace(',', '.'))
    // Only accept sizes within the scale; snap to the nearest available size.
    if (isNaN(v) || v < min || v > max) { setCustom(''); return }
    const nearest = sizes.reduce((p, c) => (Math.abs(c - v) < Math.abs(p - v) ? c : p))
    onToggleBucket([nearest]); setCustom('')
  }

  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 text-xs font-medium text-stone-400 uppercase tracking-wide pt-1.5 w-24">
        {label}
      </span>
      <div className="space-y-1.5">
        {/* Input first — between label and chips. Text + datalist (no spinner):
            only sizes within the scale are accepted, snapped to the nearest. */}
        <div className="flex items-center gap-1.5">
          <input
            type="text" inputMode="decimal" placeholder={`EU ${min}–${max}`}
            list="gallery-size-options"
            value={custom}
            onFocus={e => e.currentTarget.select()}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitCustom()}
            className="h-7 w-24 px-2 text-xs bg-white border border-stone-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
          />
          <datalist id="gallery-size-options">
            {sizes.map(s => <option key={s} value={s} />)}
          </datalist>
          <button onClick={submitCustom}
            className="h-7 px-2 text-xs font-semibold bg-stone-100 hover:bg-gold/10
                       hover:text-gold text-stone-500 rounded-lg border border-stone-200 transition-colors">
            +
          </button>
        </div>
        {/* Range chips below */}
        <div className="flex flex-wrap gap-1.5">
          {buckets.map((b) => {
            const anySelected = b.values.some((v) => selected.includes(v))
            return (
              <button
                key={b.label}
                onClick={() => onToggleBucket(b.values)}
                className={`px-2.5 py-1 text-xs font-medium rounded border transition-all duration-150
                  ${anySelected
                    ? 'bg-gold text-white border-gold shadow-sm'
                    : 'text-stone-600 border-stone-200 hover:border-gold/60 hover:text-gold bg-white'}`}
              >
                {b.label}
              </button>
            )
          })}
          {customSelected.map(s => (
            <button key={s} onClick={() => onToggleBucket([s])}
              className="px-2.5 py-1 text-xs font-medium rounded border bg-gold text-white border-gold shadow-sm">
              {s} ×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Multi-select dropdown (for closure, type, colour) ─────────────────────────
function MultiDropdown({
  placeholder,
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  placeholder: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  renderLabel?: (v: string) => string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const show = (v: string) => (renderLabel ? renderLabel(v) : v)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? show(selected[0])
      : `${show(selected[0])} +${selected.length - 1}`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`h-9 px-3 pr-8 text-sm rounded-lg border transition-colors duration-150 flex items-center gap-1.5
          ${selected.length > 0
            ? 'bg-gold/10 border-gold text-gold font-medium'
            : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'}`}
      >
        <span className="truncate max-w-[140px]">{label}</span>
      </button>
      {/* Chevron */}
      <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={open ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
      </svg>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-[180px] max-h-64 overflow-y-auto
                        bg-white border border-stone-200 rounded-lg shadow-lg py-1">
              {options.map((o) => (
            <label
              key={o}
              onClick={(e) => { e.stopPropagation(); onToggle(o) }}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-stone-50 transition-colors select-none"
            >
              <span
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all
                  ${selected.includes(o) ? 'bg-gold border-gold' : 'border-stone-300'}`}
              >
                {selected.includes(o) && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-sm text-stone-700 truncate">{show(o)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function GalleryFilters({
  filters, setFilters,
  optClosures, optTypes, optColours, optConstructions, optWidths, optSizes,
  hasNew, hasFilters, onClear, resultCount, wishlistCount,
  showWishlist, onToggleBuildWishlist,
}: Props) {
  const t = useTranslations('gallery.filters')
  const tg = useTranslations('gallery')
  const locale = useLocale() as Locale
  const tr = (v: string) => translateFilterValueSync(v, locale)
  const [open, setOpen] = useState(false)

  function toggleArr(key: keyof Filters, val: string) {
    setFilters((f) => {
      const arr = f[key] as string[]
      const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
      return { ...f, [key]: next }
    })
  }

  function toggleSizeBucket(vals: number[]) {
    setFilters((f) => {
      const anySelected = vals.some((v) => f.sizes.includes(v))
      const next = anySelected
        ? f.sizes.filter((s) => !vals.includes(s))
        : [...f.sizes, ...vals.filter((v) => !f.sizes.includes(v))]
      return { ...f, sizes: next }
    })
  }

  const activeCount = filters.closures.length + filters.types.length + filters.colours.length
    + filters.constructions.length + filters.widths.length + filters.sizes.length
    + (filters.onlyNew ? 1 : 0)

  return (
    <div className="space-y-2">
      {/* Always-visible bar */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Filters toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className={`h-9 px-3 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-all
            ${open || activeCount > 0
              ? 'bg-stone-800 text-white border-stone-800'
              : 'text-stone-600 border-stone-200 hover:border-stone-400 bg-white'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M13 16h-2" />
          </svg>
          {t('filters_button')}
          {activeCount > 0 && (
            <span className="min-w-[18px] h-4.5 px-1 text-[10px] font-bold bg-gold text-white rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          )}
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Build wishlist toggle */}
        <button
          onClick={onToggleBuildWishlist}
          className={`h-9 px-3 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-all
            ${showWishlist ? 'bg-gold/10 border-gold text-gold font-semibold' : 'text-stone-500 border-stone-200 hover:border-gold/40 hover:text-gold bg-white'}`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={showWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          {t('wishlist_button')}
        </button>

        {showWishlist && wishlistCount > 0 && (
          <button
            onClick={() => setFilters((f) => ({ ...f, onlyWishlist: !f.onlyWishlist }))}
            className={`h-9 px-3 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-all
              ${filters.onlyWishlist ? 'bg-gold text-white border-gold' : 'text-stone-600 border-stone-200 hover:border-gold/60 hover:text-gold bg-white'}`}
          >
            {wishlistCount} selected
          </button>
        )}

        {hasFilters && (
          <button onClick={onClear} className="h-9 px-3 text-xs text-stone-400 hover:text-stone-700 transition-colors">
            {t('all')}
          </button>
        )}

        <p className="ml-auto text-sm text-stone-400 shrink-0">
          {tg('results', { count: resultCount })}
        </p>
      </div>

      {/* Collapsible panel */}
      {open && (
        <div className="border border-stone-200 rounded-xl bg-white px-5 py-4 space-y-4"
          style={{ boxShadow: 'var(--shadow-card)' }}>

          {/* Closure chips */}
          {optClosures.length > 0 && (
            <SquareChips label={t('closure')} options={optClosures} selected={filters.closures} onToggle={(v) => toggleArr('closures', v)} renderLabel={tr} />
          )}

          {/* Type chips */}
          {optTypes.length > 0 && (
            <SquareChips label={t('type')} options={optTypes} selected={filters.types} onToggle={(v) => toggleArr('types', v)} renderLabel={tr} />
          )}

          {/* Construction chips — above colour */}
          {optConstructions.length > 1 && (
            <SquareChips label={t('construction')} options={optConstructions} selected={filters.constructions} onToggle={(v) => toggleArr('constructions', v)} renderLabel={tr} />
          )}

          {/* Colour — label left, dropdown right (no placeholder text), NEW inline */}
          {optColours.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs font-medium text-stone-400 uppercase tracking-wide w-24">
                {t('colour')}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <MultiDropdown placeholder="—" options={optColours} selected={filters.colours} onToggle={(v) => toggleArr('colours', v)} renderLabel={tr} />
                {hasNew && (
                  <button onClick={() => setFilters((f) => ({ ...f, onlyNew: !f.onlyNew }))}
                    className={`h-9 px-3 text-xs font-bold tracking-widest rounded-lg border transition-all
                      ${filters.onlyNew ? 'bg-gold text-white border-gold' : 'text-gold border-gold/40 hover:border-gold hover:bg-gold/5'}`}>
                    {t('new')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Width pills */}
          {optWidths.length > 1 && (
            <PillChips label={t('width')} options={optWidths}
              selected={filters.widths} onToggle={(v) => toggleArr('widths', v)}
              renderLabel={(v) => displayWidth(v, optWidths, locale)} />
          )}

          {/* Size chips + input */}
          {optSizes.length > 1 && (
            <SizeChips label={t('size')} sizes={optSizes}
              selected={filters.sizes} onToggleBucket={toggleSizeBucket} />
          )}
        </div>
      )}
    </div>
  )
}
