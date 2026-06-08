'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { setProductActive } from '@/app/actions/admin-products'
import { SortableTh, nextSort, compareValues, type Sort } from '@/components/ui/table-controls'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`
const PAGE = 50

export type ProductRow = {
  id: string
  colour_id: string
  style_name: string
  color_name: string
  section: string
  closure: string
  type: string
  active: boolean
  picture_name: string | null
}

// Categorical select filter (matches the /orders pattern).
function FilterSelect({ value, onChange, allLabel, options }: {
  value: string; onChange: (v: string) => void; allLabel: string; options: string[]
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-9 px-3 pr-8 text-sm bg-white border border-stone-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-gold/30">
        <option value="">{allLabel}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

export default function ProductsList({ products }: { products: ProductRow[] }) {
  const t = useTranslations('admin.products')
  const tc = useTranslations('admin.common')
  const [rows, setRows] = useState(products)
  const [q, setQ] = useState('')
  const [fSection, setFSection] = useState('')
  const [fClosure, setFClosure] = useState('')
  const [fType, setFType] = useState('')
  const [onlyInactive, setOnlyInactive] = useState(false)
  const [sort, setSort] = useState<Sort>({ key: 'colour_id', dir: 'asc' })
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)

  const distinct = (key: keyof ProductRow) =>
    [...new Set(rows.map(p => p[key]).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b))
  const sectionOpts = useMemo(() => distinct('section'), [rows]) // eslint-disable-line react-hooks/exhaustive-deps
  const closureOpts = useMemo(() => distinct('closure'), [rows]) // eslint-disable-line react-hooks/exhaustive-deps
  const typeOpts    = useMemo(() => distinct('type'),    [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = rows.filter(p => {
      if (onlyInactive && p.active) return false
      if (fSection && p.section !== fSection) return false
      if (fClosure && p.closure !== fClosure) return false
      if (fType && p.type !== fType) return false
      if (!needle) return true
      return [p.colour_id, p.style_name, p.color_name, p.closure, p.type]
        .some(v => v?.toLowerCase().includes(needle))
    })
    return [...out].sort((a, b) =>
      compareValues((a as Record<string, unknown>)[sort.key], (b as Record<string, unknown>)[sort.key], sort.dir))
  }, [rows, q, onlyInactive, fSection, fClosure, fType, sort])

  const onSort = (key: string) => setSort(s => nextSort(s, key))
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const pages = Math.ceil(filtered.length / PAGE)

  async function toggle(id: string, active: boolean) {
    setBusy(id)
    const res = await setProductActive(id, active)
    if (!res.error) setRows(prev => prev.map(p => p.id === id ? { ...p, active } : p))
    setBusy(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setPage(0) }}
          placeholder={t('search_placeholder')}
          className="flex-1 min-w-[220px] rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none"
        />
        <FilterSelect value={fSection} onChange={v => { setFSection(v); setPage(0) }} allLabel={t('all_sections')} options={sectionOpts} />
        <FilterSelect value={fClosure} onChange={v => { setFClosure(v); setPage(0) }} allLabel={t('all_closures')} options={closureOpts} />
        <FilterSelect value={fType}    onChange={v => { setFType(v);    setPage(0) }} allLabel={t('all_types')}    options={typeOpts} />
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={onlyInactive} onChange={e => { setOnlyInactive(e.target.checked); setPage(0) }} />
          {t('inactive_only')}
        </label>
        <span className="text-xs text-stone-400">{t('count_of', { shown: filtered.length, total: rows.length })}</span>
      </div>

      <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <SortableTh label="" sortKey={null} sort={sort} onSort={onSort} />
              <SortableTh label="colour_id" sortKey="colour_id" sort={sort} onSort={onSort} />
              <SortableTh label={t('col_style')} sortKey="style_name" sort={sort} onSort={onSort} />
              <SortableTh label={t('col_colour')} sortKey="color_name" sort={sort} onSort={onSort} />
              <SortableTh label={t('col_section')} sortKey="section" sort={sort} onSort={onSort} />
              <SortableTh label={t('col_closure')} sortKey="closure" sort={sort} onSort={onSort} />
              <SortableTh label={t('col_type')} sortKey="type" sort={sort} onSort={onSort} />
              <SortableTh label={t('col_active')} sortKey="active" sort={sort} onSort={onSort} />
              <SortableTh label="" sortKey={null} sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {pageRows.map(p => (
              <tr key={p.id} className={p.active ? '' : 'bg-stone-50/60'}>
                <td className="px-4 py-2">
                  <div className="h-10 w-10 rounded-lg bg-stone-100 overflow-hidden">
                    {p.picture_name && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${BUCKET}/${p.picture_name}`} alt="" className="h-full w-full object-contain" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-stone-700">{p.colour_id}</td>
                <td className="px-4 py-2 text-stone-700">{p.style_name}</td>
                <td className="px-4 py-2 text-stone-500">{p.color_name}</td>
                <td className="px-4 py-2 text-stone-500">{p.section}</td>
                <td className="px-4 py-2 text-stone-500">{p.closure}</td>
                <td className="px-4 py-2 text-stone-500">{p.type}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggle(p.id, !p.active)}
                    disabled={busy === p.id}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.active ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'}`}>
                    {p.active ? tc('active') : tc('inactive')}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/products/${p.id}/edit`} className="text-sm font-medium text-gold hover:text-gold-dark">{tc('edit')}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="rounded-lg border border-stone-200 px-3 py-1 text-sm disabled:opacity-40">{tc('prev')}</button>
          <span className="text-sm text-stone-500">{page + 1} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
            className="rounded-lg border border-stone-200 px-3 py-1 text-sm disabled:opacity-40">{tc('next')}</button>
        </div>
      )}
    </div>
  )
}
