'use client'

/**
 * Shared list-table controls — the portal's canonical pattern for data lists.
 *
 * RULE (portal-wide): every list column that can reasonably be ordered gets
 * click-to-sort (asc/desc); columns whose values are categorical and repeat
 * (status, country, role, label, …) also get a select filter. Columns with
 * unique values (name, codes) get sorting only — a search box covers lookup.
 * Keep it all client-side; it's cheap for the row counts we handle.
 */

import { useEffect, useState } from 'react'

export type SortDir = 'asc' | 'desc'

/** Stroke chevron used by GridFloatingNav (module-scope so it isn't recreated per render). */
function Chevron({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}
export type Sort = { key: string; dir: SortDir }

/** Toggle/advance the sort state for a clicked column. */
export function nextSort(prev: Sort, key: string, defaultDir: SortDir = 'asc'): Sort {
  if (prev.key !== key) return { key, dir: defaultDir }
  return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
}

/** Generic comparator: numbers numerically, everything else locale + numeric-aware. */
export function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const mul = dir === 'asc' ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * mul
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * mul
}

/** A sortable <th>. Pass `sortKey={null}` for a non-sortable header (e.g. actions). */
export function SortableTh({
  label, sortKey, sort, onSort, align = 'left', className = '', style, children,
}: {
  label?: string
  sortKey: string | null
  sort: Sort
  onSort: (key: string) => void
  align?: 'left' | 'right' | 'center'
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}) {
  const active = sortKey != null && sort.key === sortKey
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <th style={style} className={`px-4 py-2 ${alignCls} text-[11px] font-semibold text-stone-400 uppercase whitespace-nowrap select-none align-bottom ${className}`}>
      {sortKey != null ? (
        <button type="button" onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''} ${active ? 'text-stone-600' : 'hover:text-stone-600'}`}>
          {label}
          <span className="flex flex-col -space-y-1.5 text-[8px] leading-none">
            <span className={active && sort.dir === 'asc' ? 'text-gold' : 'text-stone-300'}>▲</span>
            <span className={active && sort.dir === 'desc' ? 'text-gold' : 'text-stone-300'}>▼</span>
          </span>
        </button>
      ) : (label ?? null)}
      {children}
    </th>
  )
}

/**
 * Floating navigation cluster for long/wide grids (fixed bottom-right).
 *
 * Solves two recurring pains on big data grids:
 *  - vertical: a "jump to bottom / back to top" button so you don't have to drag
 *    the page scrollbar past a tall table;
 *  - horizontal: ◀ ▶ buttons that scroll the grid sideways, so reaching off-screen
 *    columns no longer means scrolling down to the native scrollbar at the table
 *    foot. They only appear when the grid actually overflows horizontally.
 *
 * Pair with sticky left columns (position:sticky; left offset) so the identity
 * columns stay put while the rest scrolls. Reusable across every grid — pass the
 * ref of the element with `overflow-x-auto`.
 */
export function GridFloatingNav({ scrollRef, position = 'bottom-5 right-5' }: { scrollRef: React.RefObject<HTMLElement | null>; position?: string }) {
  const [atBottom, setAtBottom] = useState(false)
  const [h, setH] = useState({ scrollable: false, canLeft: false, canRight: false })

  useEffect(() => {
    const onScroll = () => {
      const sc = document.scrollingElement ?? document.documentElement
      setAtBottom(sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 80)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    const update = () => {
      const e = scrollRef.current
      if (!e) return
      setH({
        scrollable: e.scrollWidth > e.clientWidth + 1,
        canLeft: e.scrollLeft > 1,
        canRight: e.scrollLeft < e.scrollWidth - e.clientWidth - 1,
      })
    }
    update()
    el?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { el?.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [scrollRef])

  const hScroll = (dir: -1 | 1) => {
    const e = scrollRef.current
    if (!e) return
    e.scrollBy({ left: dir * Math.max(240, e.clientWidth * 0.7), behavior: 'smooth' })
  }
  const pageJump = () => {
    const sc = document.scrollingElement ?? document.documentElement
    window.scrollTo({ top: atBottom ? 0 : sc.scrollHeight, behavior: 'smooth' })
  }

  const btn = 'w-9 h-9 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-500 hover:text-gold hover:border-gold/50 transition-colors disabled:opacity-30 disabled:hover:text-stone-500 disabled:hover:border-stone-200'

  return (
    <div className={`fixed ${position} z-40 flex flex-col items-center gap-2 print:hidden`} style={{ boxShadow: 'none' }}>
      {h.scrollable && (
        <div className="flex gap-2" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}>
          <button type="button" className={btn} onClick={() => hScroll(-1)} disabled={!h.canLeft} aria-label="scroll left">
            <Chevron d="M15.75 19.5L8.25 12l7.5-7.5" />
          </button>
          <button type="button" className={btn} onClick={() => hScroll(1)} disabled={!h.canRight} aria-label="scroll right">
            <Chevron d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </button>
        </div>
      )}
      <button type="button" className={btn} onClick={pageJump} aria-label={atBottom ? 'scroll to top' : 'scroll to bottom'}
        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.12))' }}>
        <Chevron d={atBottom ? 'M4.5 15.75l7.5-7.5 7.5 7.5' : 'M19.5 8.25l-7.5 7.5-7.5-7.5'} />
      </button>
    </div>
  )
}
