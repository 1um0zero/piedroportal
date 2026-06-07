'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { nz } from '@/lib/format'
import { SortableTh, nextSort, compareValues, type Sort } from '@/components/ui/table-controls'

export type CompanyRow = {
  id: string
  name: string
  erp_code: string
  exclusive_label: string | null
  models: number
  userCount: number
  admins: string[]
  cc: string
  bcc: string
  /** Pre-built lowercase haystack: name + erp + label + every member name & email. */
  search: string
}

const NONE = '__none__'

// Sort value per column key. Empty labels are pushed to the end on asc.
function sortVal(r: CompanyRow, key: string): string | number {
  switch (key) {
    case 'name': return r.name
    case 'erp': return r.erp_code
    case 'users': return r.userCount
    case 'admins': return r.admins.length
    case 'copies': return (r.cc ? 1 : 0) + (r.bcc ? 1 : 0)
    case 'label': return r.exclusive_label || '￿'
    case 'models': return r.models
    default: return r.name
  }
}

export default function CompaniesTable({ rows }: { rows: CompanyRow[] }) {
  const t = useTranslations('admin.companies')
  const [q, setQ] = useState('')
  const [labelFilter, setLabelFilter] = useState('')
  const [sort, setSort] = useState<Sort>({ key: 'name', dir: 'asc' })

  const labelOptions = useMemo(
    () => [...new Set(rows.map(r => (r.exclusive_label ?? '').trim()).filter(Boolean))].sort(),
    [rows],
  )
  const hasNone = useMemo(() => rows.some(r => !(r.exclusive_label ?? '').trim()), [rows])

  const filtered = useMemo(() => {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
    let out = rows
    if (tokens.length) {
      // Every token must appear somewhere → composite names in any order,
      // e.g. "voet elst" → "voetmax - locaties elst".
      out = out.filter(r => tokens.every(tok => r.search.includes(tok)))
    }
    if (labelFilter === NONE) out = out.filter(r => !(r.exclusive_label ?? '').trim())
    else if (labelFilter) out = out.filter(r => (r.exclusive_label ?? '').trim() === labelFilter)
    return out
  }, [q, labelFilter, rows])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const c = compareValues(sortVal(a, sort.key), sortVal(b, sort.key), sort.dir)
      return c !== 0 ? c : a.name.localeCompare(b.name)
    })
    return arr
  }, [filtered, sort])

  const onSort = (key: string) =>
    setSort(prev => nextSort(prev, key, key === 'name' || key === 'erp' || key === 'label' ? 'asc' : 'desc'))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={t('search_placeholder')}
          className="flex-1 min-w-[260px] rounded-lg border border-stone-200 px-3.5 py-2 text-sm focus:border-gold focus:outline-none"
        />
        <span className="text-xs text-stone-400 whitespace-nowrap">
          {t('results_count', { n: sorted.length, total: rows.length })}
        </span>
      </div>

      <div className="bg-white rounded-[14px] overflow-x-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              <SortableTh label={t('col_name')}   sortKey="name"   sort={sort} onSort={onSort} />
              <SortableTh label={t('col_erp')}    sortKey="erp"    sort={sort} onSort={onSort} />
              <SortableTh label={t('col_users')}  sortKey="users"  sort={sort} onSort={onSort} />
              <SortableTh label={t('col_admins')} sortKey="admins" sort={sort} onSort={onSort} />
              <SortableTh label={t('col_copies')} sortKey="copies" sort={sort} onSort={onSort} />
              <SortableTh label={t('col_label')}  sortKey="label"  sort={sort} onSort={onSort}>
                {(labelOptions.length > 0 || hasNone) && (
                  <select
                    value={labelFilter}
                    onChange={e => setLabelFilter(e.target.value)}
                    className={`mt-1 block w-full rounded-md border px-1.5 py-0.5 text-[11px] font-normal normal-case focus:border-gold focus:outline-none ${labelFilter ? 'border-gold text-stone-700' : 'border-stone-200 text-stone-400'}`}
                  >
                    <option value="">{t('filter_all')}</option>
                    {hasNone && <option value={NONE}>{t('filter_none')}</option>}
                    {labelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
              </SortableTh>
              <SortableTh label={t('col_models')} sortKey="models" sort={sort} onSort={onSort} />
              <SortableTh label="" sortKey={null} sort={sort} onSort={onSort} align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {sorted.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-stone-400">{t('no_results')}</td></tr>
            ) : sorted.map(c => (
              <tr key={c.id} className="hover:bg-stone-50/60">
                <td className="px-4 py-3 font-medium text-stone-800">{c.name}</td>
                <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{c.erp_code || '—'}</td>
                <td className="px-4 py-3 text-stone-600 tabular-nums">{nz(c.userCount)}</td>
                <td className="px-4 py-3">
                  {c.admins.length
                    ? <div className="flex flex-wrap gap-1">
                        {c.admins.map((a, i) =>
                          <span key={i} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{a}</span>)}
                      </div>
                    : <span className="text-stone-300">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-stone-500 max-w-[200px]">
                  {c.cc || c.bcc
                    ? <div className="space-y-0.5">
                        {c.cc && <div className="truncate" title={c.cc}><span className="text-stone-400">Cc:</span> {c.cc}</div>}
                        {c.bcc && <div className="truncate" title={c.bcc}><span className="text-stone-400">Bcc:</span> {c.bcc}</div>}
                      </div>
                    : <span className="text-stone-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  {c.exclusive_label
                    ? <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-mono font-medium text-gold">{c.exclusive_label}</span>
                    : <span className="text-stone-300">—</span>}
                </td>
                <td className="px-4 py-3 text-stone-500 tabular-nums">{nz(c.models)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link href={`/admin/companies/${c.id}`} className="text-sm font-medium text-gold hover:text-gold-dark">{t('manage')}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
