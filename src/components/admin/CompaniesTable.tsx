'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

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

export default function CompaniesTable({ rows }: { rows: CompanyRow[] }) {
  const t = useTranslations('admin.companies')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return rows
    // Every token must appear somewhere in the haystack → matches composite names
    // in any order, e.g. "voet elst" → "voetmax - locaties elst".
    return rows.filter(r => tokens.every(tok => r.search.includes(tok)))
  }, [q, rows])

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
          {t('results_count', { n: filtered.length, total: rows.length })}
        </span>
      </div>

      <div className="bg-white rounded-[14px] overflow-x-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full text-sm">
          <thead className="bg-stone-50">
            <tr>
              {[t('col_name'), t('col_erp'), t('col_users'), t('col_admins'), t('col_copies'), t('col_label'), t('col_models'), ''].map((c, i) =>
                <th key={i} className="px-4 py-2 text-left text-[11px] font-semibold text-stone-400 uppercase whitespace-nowrap">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-stone-400">{t('no_results')}</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-stone-50/60">
                <td className="px-4 py-3 font-medium text-stone-800">{c.name}</td>
                <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{c.erp_code || '—'}</td>
                <td className="px-4 py-3 text-stone-600 tabular-nums">{c.userCount}</td>
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
                <td className="px-4 py-3 text-stone-500 tabular-nums">{c.models}</td>
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
