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
import { useTranslations } from 'next-intl'

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

/**
 * Canonical sticky pagination footer for every paginated list in the portal.
 *
 * - Sticks to the viewport foot (opaque) so a row scrolled underneath can never
 *   land on a page button and hijack an intended page-click into a row-click.
 * - ⏮ First / ⏭ Last jump straight to the newest/oldest page.
 * - `pageLabel(p)` (optional) supplies a hover hint per page button — e.g. the
 *   date of that page's first row — so users can locate old records fast.
 *
 * Pair with `useListNav` for page state + return-position restore, and
 * `GridFloatingNav` for top/bottom + sideways scrolling.
 */
export function ListPager({ page, total, onPage, pageLabel, className = '-mx-6 px-6' }: {
  page: number
  total: number
  onPage: (p: number) => void
  pageLabel?: (p: number) => string | undefined
  /** Wrapper padding/bleed — defaults to full-bleed inside a px-6 container. */
  className?: string
}) {
  const tc = useTranslations('admin.common')
  if (total <= 1) return null
  const edge = 'px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg disabled:opacity-40 hover:border-stone-300 transition-colors'
  return (
    <div className={`sticky bottom-0 z-30 ${className} py-3 flex items-center justify-center gap-2 bg-white/95 backdrop-blur border-t border-stone-100`}>
      <button onClick={() => onPage(1)} disabled={page === 1}
        title={[tc('first'), pageLabel?.(1)].filter(Boolean).join(' · ')} className={edge}>⏮</button>
      <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className={edge}>← {tc('prev')}</button>

      {Array.from({ length: Math.min(7, total) }, (_, i) => {
        let p: number
        if (total <= 7) p = i + 1
        else if (page <= 4) p = i + 1
        else if (page >= total - 3) p = total - 6 + i
        else p = page - 3 + i
        return (
          <button key={p} onClick={() => onPage(p)} title={pageLabel?.(p)}
            className={`w-9 h-9 text-sm rounded-lg border transition-colors
              ${p === page ? 'bg-gold text-white border-gold' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}>
            {p}
          </button>
        )
      })}

      <button onClick={() => onPage(Math.min(total, page + 1))} disabled={page >= total} className={edge}>{tc('next')} →</button>
      <button onClick={() => onPage(total)} disabled={page >= total}
        title={[tc('last'), pageLabel?.(total)].filter(Boolean).join(' · ')} className={edge}>⏭</button>
    </div>
  )
}
