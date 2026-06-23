'use client'

/**
 * Flat grid of all users — built for quickly validating profile data
 * (language, companies, role, branch…) at a glance. Language is editable
 * inline (non-sensitive, speeds up launch admin); all other editing stays
 * in the card view. Columns are drag-resizable on the header edges.
 */

import { useCallback, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Sort, nextSort, compareValues, SortableTh } from '@/components/ui/table-controls'
import { isPiedroAdmin } from '@/lib/roles'
import { updateUserLocaleAction } from '@/app/actions/admin-users'
import { startImpersonation } from '@/app/actions/impersonation'

const LOCALES = ['en', 'nl', 'fr', 'de'] as const
type Locale = typeof LOCALES[number]

/** Column ids in display order, with default widths (px). */
const COLUMNS = [
  { id: 'name',        width: 160 },
  { id: 'email',       width: 230 },
  { id: 'role',        width: 130 },
  { id: 'locale',      width: 100 },
  { id: 'companies',   width: 260 },
  { id: 'n_companies', width: 50  },
  { id: 'branch',      width: 130 },
  { id: 'status',      width: 110 },
  { id: 'created_at',  width: 110 },
  { id: 'act',         width: 110 },
] as const
const MIN_COL_WIDTH = 50

type UserRole = 'user' | 'company_admin' | 'piedro_admin' | 'branch_staff' | 'branch_admin' | 'super_admin'

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
  branch_admin:  'bg-teal-50 text-teal-600',
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

/** Drag handle on a header's right edge — resizes the column. */
function ColResizer({ onResize }: { onResize: (delta: number) => void }) {
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    let last = 0
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      onResize(delta - last)
      last = delta
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'col-resize'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
  return (
    <span
      onMouseDown={onMouseDown}
      onClick={e => e.stopPropagation()}
      className="absolute top-0 right-0 h-full w-[5px] cursor-col-resize select-none hover:bg-gold/40"
    />
  )
}

export default function AdminUsersGrid({ users, branches }: { users: UserRow[]; branches: BranchOpt[] }) {
  const t = useTranslations('admin.users')
  const ti = useTranslations('impersonation')
  const locale = useLocale()
  const [impersonating, setImpersonating] = useState<string | null>(null)

  // Step into a user's real session to validate their permissions. Hard-reload
  // to the gallery so the server re-reads the swapped session cookies.
  const viewAs = async (userId: string) => {
    setImpersonating(userId)
    const res = await startImpersonation(userId)
    if (res.error) {
      setImpersonating(null)
      alert(res.error)
      return
    }
    window.location.replace(`/${locale}/gallery`)
  }
  const [sort, setSort] = useState<Sort>({ key: 'created_at', dir: 'desc' })
  const [search, setSearch] = useState('')
  const [fRole, setFRole] = useState('')
  const [fLocale, setFLocale] = useState('')
  const [fCompany, setFCompany] = useState('')
  const [fBranch, setFBranch] = useState('')
  const [fStatus, setFStatus] = useState('')

  // Column widths — initialized from defaults, mutated by the drag handles.
  const [colWidths, setColWidths] = useState<Record<string, number>>(
    () => Object.fromEntries(COLUMNS.map(c => [c.id, c.width])))
  const resizeCol = useCallback((id: string, delta: number) => {
    setColWidths(prev => ({ ...prev, [id]: Math.max(MIN_COL_WIDTH, prev[id] + delta) }))
  }, [])

  // Inline language edits — optimistic overrides on top of the server data.
  const [localeOverrides, setLocaleOverrides] = useState<Record<string, Locale | null>>({})
  const [savingLocale, setSavingLocale] = useState<string | null>(null)

  const effUsers = useMemo(() =>
    users.map(u => u.id in localeOverrides ? { ...u, preferred_locale: localeOverrides[u.id] } : u),
    [users, localeOverrides])

  const changeLocale = async (userId: string, value: string) => {
    const locale = (value || null) as Locale | null
    const prev = effUsers.find(u => u.id === userId)?.preferred_locale ?? null
    setLocaleOverrides(o => ({ ...o, [userId]: locale }))
    setSavingLocale(userId)
    const res = await updateUserLocaleAction(userId, locale)
    setSavingLocale(null)
    if (res.error) {
      setLocaleOverrides(o => ({ ...o, [userId]: prev as Locale | null }))
      alert(res.error)
    }
  }

  const branchName = useMemo(() => new Map(branches.map(b => [b.id, b.name])), [branches])

  const status = (u: UserRow) =>
    isPiedroAdmin(u.role) ? 'admin' : u.companies.length > 0 ? 'active' : 'pending'

  // Filter options derived from the data actually present
  const roleOptions = useMemo(() =>
    [...new Set(effUsers.map(u => u.role))].sort().map(r => ({ value: r, label: t(`role_${r}`) })), [effUsers, t])
  const localeOptions = useMemo(() =>
    [...new Set(effUsers.map(u => u.preferred_locale ?? ''))].sort()
      .map(l => ({ value: l || '—', label: l ? l.toUpperCase() : '—' })), [effUsers])
  const companyOptions = useMemo(() => {
    const names = new Set<string>()
    for (const u of effUsers) for (const c of u.companies) if (c.company_name) names.add(c.company_name)
    return [...names].sort((a, b) => a.localeCompare(b)).map(n => ({ value: n, label: n }))
  }, [effUsers])
  const branchOptions = useMemo(() =>
    branches.map(b => ({ value: b.id, label: b.name })), [branches])
  const statusOptions = [
    { value: 'pending', label: t('grid_status_pending') },
    { value: 'active',  label: t('grid_status_active') },
    { value: 'admin',   label: t('grid_status_admin') },
  ]

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = effUsers.filter(u => {
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
  }, [effUsers, search, fRole, fLocale, fCompany, fBranch, fStatus, sort, branchName])

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
        <table className="text-sm" style={{ tableLayout: 'fixed', width: Object.values(colWidths).reduce((a, b) => a + b, 0), minWidth: '100%' }}>
          <colgroup>
            {COLUMNS.map(c => <col key={c.id} style={{ width: colWidths[c.id] }} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-stone-100">
              <SortableTh label={t('grid_col_name')} sortKey="name" sort={sort} onSort={onSort} className="relative">
                <ColResizer onResize={d => resizeCol('name', d)} />
              </SortableTh>
              <SortableTh label={t('grid_col_email')} sortKey="email" sort={sort} onSort={onSort} className="relative">
                <ColResizer onResize={d => resizeCol('email', d)} />
              </SortableTh>
              <SortableTh label={t('grid_col_role')} sortKey="role" sort={sort} onSort={onSort} className="relative">
                <HeaderFilter value={fRole} onChange={setFRole} allLabel={t('grid_all')} options={roleOptions} />
                <ColResizer onResize={d => resizeCol('role', d)} />
              </SortableTh>
              <SortableTh label={t('grid_col_language')} sortKey="locale" sort={sort} onSort={onSort} className="relative">
                <HeaderFilter value={fLocale} onChange={setFLocale} allLabel={t('grid_all')} options={localeOptions} />
                <ColResizer onResize={d => resizeCol('locale', d)} />
              </SortableTh>
              <SortableTh label={t('grid_col_companies')} sortKey="companies" sort={sort} onSort={onSort} className="relative">
                <HeaderFilter value={fCompany} onChange={setFCompany} allLabel={t('grid_all')} options={companyOptions} />
                <ColResizer onResize={d => resizeCol('companies', d)} />
              </SortableTh>
              <SortableTh label="#" sortKey="n_companies" sort={sort} onSort={onSort} align="right" className="relative">
                <ColResizer onResize={d => resizeCol('n_companies', d)} />
              </SortableTh>
              <SortableTh label={t('grid_col_branch')} sortKey="branch" sort={sort} onSort={onSort} className="relative">
                <HeaderFilter value={fBranch} onChange={setFBranch} allLabel={t('grid_all')} options={branchOptions} />
                <ColResizer onResize={d => resizeCol('branch', d)} />
              </SortableTh>
              <SortableTh label={t('grid_col_status')} sortKey="status" sort={sort} onSort={onSort} className="relative">
                <HeaderFilter value={fStatus} onChange={setFStatus} allLabel={t('grid_all')} options={statusOptions} />
                <ColResizer onResize={d => resizeCol('status', d)} />
              </SortableTh>
              <SortableTh label={t('grid_col_created')} sortKey="created_at" sort={sort} onSort={onSort} className="relative">
                <ColResizer onResize={d => resizeCol('created_at', d)} />
              </SortableTh>
              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400">{ti('view_as')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => {
              const st = status(u)
              return (
                <tr key={u.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/60">
                  <td className="px-4 py-2 font-medium text-stone-800 truncate" title={u.full_name || undefined}>{u.full_name || '—'}</td>
                  <td className="px-4 py-2 text-stone-500 truncate" title={u.email}>{u.email}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg ${ROLE_COLORS[u.role]}`}>
                      {t(`role_${u.role}`)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={u.preferred_locale ?? ''}
                      onChange={e => changeLocale(u.id, e.target.value)}
                      disabled={savingLocale === u.id}
                      className={`w-full px-1 py-0.5 text-xs rounded border bg-white focus:border-gold focus:outline-none disabled:opacity-50
                        ${u.preferred_locale ? 'border-stone-200 text-stone-700' : 'border-amber-300 text-amber-600'}`}>
                      <option value="">—</option>
                      {LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-stone-600 truncate">
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
                  <td className="px-4 py-2 text-stone-600 truncate">{u.branch_id ? (branchName.get(u.branch_id) ?? '—') : '—'}</td>
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
                  <td className="px-4 py-2 whitespace-nowrap">
                    {isPiedroAdmin(u.role) ? (
                      <span className="text-xs text-stone-300">—</span>
                    ) : (
                      <button
                        onClick={() => viewAs(u.id)}
                        disabled={impersonating === u.id}
                        title={ti('view_as_hint')}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gold/40 text-gold hover:bg-gold/10 disabled:opacity-50">
                        {impersonating === u.id ? ti('starting') : ti('view_as')}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-stone-400">{t('grid_no_results')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
