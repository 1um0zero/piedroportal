'use client'

/**
 * Read-only flat grid of all users — built for quickly validating profile
 * data (language, companies, role, branch…) at a glance. Editing stays in
 * the card view; this grid is sort + filter only.
 */

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Sort, nextSort, compareValues, SortableTh } from '@/components/ui/table-controls'
import { isPiedroAdmin } from '@/lib/roles'

type UserRole = 'user' | 'company_admin' | 'piedro_admin' | 'branch_staff' | 'super_admin'

type UserCompany = {
  company_id: string
  company_name: string
  is_company_admin: boolean
}

type UserRow = {
  id: string
  email: string
  full_name: string
  role: UserRole
  companies: UserCompany[]
  branch_id: string | null
  created_at: string
  preferred_locale: string | null
}

type BranchOpt = { id: string; name: string }

const ROLE_COLORS: Record<UserRole, string> = {
  user:          'bg-stone-100 text-stone-600',
  company_admin: 'bg-blue-50 text-blue-600',
  piedro_admin:  'bg-gold/10 text-gold',
  branch_staff:  'bg-emerald-50 text-emerald-600',
  super_admin:   'bg-stone-800 text-white',
}

/** Small select rendered under a column header. */
function HeaderFilter({ value, onChange, allLabel, options }: {
  value: string
  onChange: (v: string) => void
  allLabel: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
      className={`block mt-1 w-full max-w-[140px] px-1 py-0.5 text-[11px] font-normal normal-case rounded border bg-white focus:border-gold focus:outline-none
        ${value ? 'border-gold text-gold' : 'border-stone-200 text-stone-500'}`}>
      <option value="">{allLabel}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export default function AdminUsersGrid({ users, branches }: { users: UserRow[]; branches: BranchOpt[] }) {
  const t = useTranslations('admin.users')
  const [sort, setSort] = useState<Sort>({ key: 'created_at', dir: 'desc' })
  const [search, setSearch] = useState('')
  const [fRole, setFRole] = useState('')
  const [fLocale, setFLocale] = useState('')
  const [fCompany, setFCompany] = useState('')
  const [fBranch, setFBranch] = useState('')
  const [fStatus, setFStatus] = useState('')

  const branchName = useMemo(() => new Map(branches.map(b => [b.id, b.name])), [branches])

  const status = (u: UserRow) =>
    isPiedroAdmin(u.role) ? 'admin' : u.companies.length > 0 ? 'active' : 'pending'

  // Filter options derived from the data actually present
  const roleOptions = useMemo(() =>
    [...new Set(users.map(u => u.role))].sort().map(r => ({ value: r, label: t(`role_${r}`) })), [users, t])
  const localeOptions = useMemo(() =>
    [...new Set(users.map(u => u.preferred_locale ?? ''))].sort()
      .map(l => ({ value: l || '—', label: l ? l.toUpperCase() : '—' })), [users])
  const companyOptions = useMemo(() => {
    const names = new Set<string>()
    for (const u of users) for (const c of u.companies) if (c.company_name) names.add(c.company_name)
    return [...names].sort((a, b) => a.localeCompare(b)).map(n => ({ value: n, label: n }))
  }, [users])
  const branchOptions = useMemo(() =>
    branches.map(b => ({ value: b.id, label: b.name })), [branches])
  const statusOptions = [
    { value: 'pending', label: t('grid_status_pending') },
    { value: 'active',  label: t('grid_status_active') },
    { value: 'admin',   label: t('grid_status_admin') },
  ]

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = users.filter(u => {
      if (q && !(`${u.full_name} ${u.email}`.toLowerCase().includes(q))) return false
      if (fRole && u.role !== fRole) return false
      if (fLocale && (u.preferred_locale ?? '—') !== fLocale) return false
      if (fCompany && !u.companies.some(c => c.company_name === fCompany)) return false
      if (fBranch && u.branch_id !== fBranch) return false
      if (fStatus && status(u) !== fStatus) return false
      return true
    })
    const value = (u: UserRow): unknown => {
      switch (sort.key) {
        case 'name':       return u.full_name || u.email
        case 'email':      return u.email
        case 'role':       return u.role
        case 'locale':     return u.preferred_locale ?? ''
        case 'companies':  return u.companies.map(c => c.company_name).sort().join(', ')
        case 'n_companies': return u.companies.length
        case 'branch':     return u.branch_id ? (branchName.get(u.branch_id) ?? '') : ''
        case 'status':     return status(u)
        case 'created_at': return u.created_at
        default:           return ''
      }
    }
    return [...filtered].sort((a, b) => compareValues(value(a), value(b), sort.dir))
  }, [users, search, fRole, fLocale, fCompany, fBranch, fStatus, sort, branchName])

  const onSort = (key: string) => setSort(prev => nextSort(prev, key))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('grid_search')}
          className="w-72 px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-700 placeholder-stone-400
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
        />
        <span className="text-xs text-stone-400">{t('grid_count', { count: rows.length, total: users.length })}</span>
      </div>

      <div className="bg-white rounded-[14px] overflow-x-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100">
              <SortableTh label={t('grid_col_name')} sortKey="name" sort={sort} onSort={onSort} />
              <SortableTh label={t('grid_col_email')} sortKey="email" sort={sort} onSort={onSort} />
              <SortableTh label={t('grid_col_role')} sortKey="role" sort={sort} onSort={onSort}>
                <HeaderFilter value={fRole} onChange={setFRole} allLabel={t('grid_all')} options={roleOptions} />
              </SortableTh>
              <SortableTh label={t('grid_col_language')} sortKey="locale" sort={sort} onSort={onSort}>
                <HeaderFilter value={fLocale} onChange={setFLocale} allLabel={t('grid_all')} options={localeOptions} />
              </SortableTh>
              <SortableTh label={t('grid_col_companies')} sortKey="companies" sort={sort} onSort={onSort}>
                <HeaderFilter value={fCompany} onChange={setFCompany} allLabel={t('grid_all')} options={companyOptions} />
              </SortableTh>
              <SortableTh label="#" sortKey="n_companies" sort={sort} onSort={onSort} align="right" />
              <SortableTh label={t('grid_col_branch')} sortKey="branch" sort={sort} onSort={onSort}>
                <HeaderFilter value={fBranch} onChange={setFBranch} allLabel={t('grid_all')} options={branchOptions} />
              </SortableTh>
              <SortableTh label={t('grid_col_status')} sortKey="status" sort={sort} onSort={onSort}>
                <HeaderFilter value={fStatus} onChange={setFStatus} allLabel={t('grid_all')} options={statusOptions} />
              </SortableTh>
              <SortableTh label={t('grid_col_created')} sortKey="created_at" sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map(u => {
              const st = status(u)
              return (
                <tr key={u.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/60">
                  <td className="px-4 py-2 font-medium text-stone-800 whitespace-nowrap">{u.full_name || '—'}</td>
                  <td className="px-4 py-2 text-stone-500 whitespace-nowrap">{u.email}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg ${ROLE_COLORS[u.role]}`}>
                      {t(`role_${u.role}`)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-stone-600">{u.preferred_locale ? u.preferred_locale.toUpperCase() : '—'}</td>
                  <td className="px-4 py-2 text-stone-600 max-w-[340px]">
                    {u.companies.length === 0 ? '—' : (
                      <span title={u.companies.map(c => c.company_name).join(', ')}>
                        {u.companies.map((c, i) => (
                          <span key={c.company_id}>
                            {i > 0 && ', '}
                            <span className={c.is_company_admin ? 'text-blue-600 font-medium' : ''}>{c.company_name}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-stone-500">{u.companies.length === 0 ? '—' : u.companies.length}</td>
                  <td className="px-4 py-2 text-stone-600 whitespace-nowrap">{u.branch_id ? (branchName.get(u.branch_id) ?? '—') : '—'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${
                      st === 'admin' ? 'text-gold' : st === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        st === 'admin' ? 'bg-gold' : st === 'active' ? 'bg-green-400' : 'bg-amber-400'}`} />
                      {t(`grid_status_${st}`)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-stone-500 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-stone-400">{t('grid_no_results')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
