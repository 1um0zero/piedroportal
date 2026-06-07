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

export type SortDir = 'asc' | 'desc'
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
  label, sortKey, sort, onSort, align = 'left', className = '', children,
}: {
  label?: string
  sortKey: string | null
  sort: Sort
  onSort: (key: string) => void
  align?: 'left' | 'right' | 'center'
  className?: string
  children?: React.ReactNode
}) {
  const active = sortKey != null && sort.key === sortKey
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <th className={`px-4 py-2 ${alignCls} text-[11px] font-semibold text-stone-400 uppercase whitespace-nowrap select-none align-bottom ${className}`}>
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
