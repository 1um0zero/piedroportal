'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateUserRoleAction, toggleCompanyAdminAction, addUserCompanyAction, removeUserCompanyAction, deleteUserAction } from '@/app/actions/admin-users'
import { assignUserBranch } from '@/app/actions/admin-branches'
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
}

type Company = { id: string; name: string }
type BranchOpt = { id: string; name: string }
type Props   = { users: UserRow[]; companies: Company[]; branches: BranchOpt[] }

const ROLE_COLORS: Record<UserRole, string> = {
  user:          'bg-stone-100 text-stone-600',
  company_admin: 'bg-blue-50 text-blue-600',
  piedro_admin:  'bg-gold/10 text-gold',
  branch_staff:  'bg-emerald-50 text-emerald-600',
  super_admin:   'bg-stone-800 text-white',
}

type RowProps = {
  u: UserRow
  companies: Company[]
  branches: BranchOpt[]
  expandedUser: string | null
  setExpandedUser: (id: string | null) => void
  saving: string | null
  msg: { id: string; ok: boolean; text?: string } | null
  changeRole: (userId: string, role: UserRole) => void
  changeBranch: (userId: string, branchId: string | null) => void
  toggleCompanyAdmin: (userId: string, companyId: string, isAdmin: boolean) => void
  addCompany: (userId: string, companyId: string) => void
  removeCompany: (userId: string, companyId: string) => void
  deleteUser: (userId: string, label: string) => void
}

function Row({ u, companies, branches, expandedUser, setExpandedUser, saving, msg, changeRole, changeBranch, toggleCompanyAdmin, addCompany, removeCompany, deleteUser }: RowProps) {
  const t = useTranslations('admin.users')
  const isExpanded = expandedUser === u.id
  const userCompanyIds = new Set(u.companies.map(c => c.company_id))
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  // Filter companies: search always searches all, but assigned stay at top
  let filteredCompanies: Company[]
  if (searchQuery) {
    // When searching: assigned first (all of them), then non-assigned that match
    const assigned = companies.filter(c => userCompanyIds.has(c.id))
    const nonAssignedMatching = companies.filter(c =>
      !userCompanyIds.has(c.id) &&
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    filteredCompanies = [...assigned, ...nonAssignedMatching]
  } else {
    // No search: respect toggle
    if (showAll) {
      filteredCompanies = companies
    } else {
      filteredCompanies = companies.filter(c => userCompanyIds.has(c.id))
    }
  }

  return (
    <div className="py-3.5 border-b border-stone-50 last:border-0 space-y-2.5">
      {/* User info */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">{u.full_name || '—'}</p>
          <p className="text-xs text-stone-400 truncate">{u.email}</p>
        </div>
        {/* Safe delete — server refuses if the user has any orders */}
        {!isPiedroAdmin(u.role) && (
          <button
            onClick={() => deleteUser(u.id, u.full_name || u.email)}
            disabled={saving === u.id}
            title={t('delete_user')}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        {saving === u.id && (
          <span className="w-4 h-4 border-2 border-stone-200 border-t-gold rounded-full animate-spin shrink-0" />
        )}
        {msg?.id === u.id && (
          <span className={`text-xs font-medium shrink-0 ${msg.ok ? 'text-green-500' : 'text-red-500'}`}>
            {msg.ok ? '✓' : (msg.text ?? '✗')}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Role chips (super_admin is assigned via CLI, shown as a static badge) */}
        <div className="flex gap-1">
          {u.role === 'super_admin' ? (
            <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg ${ROLE_COLORS.super_admin}`}>
              {t('role_super_admin')}
            </span>
          ) : (['user', 'branch_staff', 'piedro_admin'] as UserRole[]).map(role => (
            <button key={role}
              onClick={() => u.role !== role && changeRole(u.id, role)}
              disabled={saving === u.id}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all disabled:opacity-50
                ${u.role === role
                  ? `${ROLE_COLORS[role]} border-current`
                  : 'text-stone-400 border-stone-200 hover:border-stone-400 bg-white'}`}>
              {t(`role_${role}`)}
            </button>
          ))}
        </div>

        {/* Branch selector — only relevant for branch_staff */}
        {u.role === 'branch_staff' && (
          <select
            value={u.branch_id ?? ''}
            onChange={e => changeBranch(u.id, e.target.value || null)}
            disabled={saving === u.id}
            className="px-2 py-1 text-[11px] font-medium rounded-lg border border-stone-200 bg-white text-stone-600 focus:border-gold focus:outline-none disabled:opacity-50">
            <option value="">{t('no_branch')}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        {/* Companies summary + toggle */}
        {!isPiedroAdmin(u.role) && (
          <>
            <span className="text-xs text-stone-500">
              {u.companies.length === 0 ? t('no_companies') : (() => {
                const adminCount = u.companies.filter(c => c.is_company_admin).length
                const companyText = t('company_count', { count: u.companies.length })
                return adminCount > 0 ? `${companyText} · ${t('admin_count', { count: adminCount })}` : companyText
              })()}
            </span>
            <button
              onClick={() => setExpandedUser(isExpanded ? null : u.id)}
              className="text-xs text-gold hover:text-gold-dark font-medium">
              {isExpanded ? `▲ ${t('hide')}` : `▼ ${t('manage')}`}
            </button>
          </>
        )}
      </div>

      {/* Expanded: Company management */}
      {isExpanded && !isPiedroAdmin(u.role) && (
        <div className="mt-3 p-3 bg-stone-50 rounded-lg space-y-3 relative">
          {/* Loading overlay */}
          {saving === u.id && (
            <div className="absolute inset-0 bg-stone-50/80 rounded-lg flex items-center justify-center z-10">
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <span className="w-5 h-5 border-2 border-stone-300 border-t-gold rounded-full animate-spin" />
                <span>{t('updating')}</span>
              </div>
            </div>
          )}

          {/* Header with filters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">{t('companies')}</p>

              {/* Toggle: action-based label */}
              <button
                onClick={() => setShowAll(!showAll)}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all
                  ${showAll
                    ? 'bg-gold/10 text-gold border-gold'
                    : 'bg-white text-stone-500 border-stone-300 hover:border-stone-400'}`}>
                {showAll ? t('view_assigned') : t('view_all')}
              </button>
            </div>

            {/* Search input */}
            <input
              type="text"
              placeholder={t('search_companies')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg
                         text-stone-700 placeholder-stone-400
                         focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
            />
          </div>

          {/* Companies list */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredCompanies.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-4">
                {searchQuery ? t('no_companies_found') : (showAll ? t('no_companies_available') : t('no_assigned_companies'))}
              </p>
            ) : (
              filteredCompanies.map(company => {
                const isMember = userCompanyIds.has(company.id)
                const uc = u.companies.find(c => c.company_id === company.id)
                return (
                  <div key={company.id} className="flex items-center gap-2">
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isMember}
                        onChange={() => isMember ? removeCompany(u.id, company.id) : addCompany(u.id, company.id)}
                        disabled={saving === u.id}
                        className="w-4 h-4 rounded border-stone-300 text-gold focus:ring-gold/30 disabled:opacity-50"
                      />
                      <span className="text-sm text-stone-700">{company.name}</span>
                    </label>

                    {/* Company Admin toggle — only if member */}
                    {isMember && uc && (
                      <button
                        onClick={() => toggleCompanyAdmin(u.id, company.id, !uc.is_company_admin)}
                        disabled={saving === u.id}
                        className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all disabled:opacity-50
                          ${uc.is_company_admin
                            ? 'bg-blue-50 text-blue-600 border-blue-600'
                            : 'text-stone-400 border-stone-200 hover:border-stone-400 bg-white'}`}
                        title={uc.is_company_admin ? t('remove_admin') : t('make_admin')}>
                        {t('admin_btn')}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminUsers({ users: initial, companies, branches }: Props) {
  const t = useTranslations('admin.users')
  const [users, setUsers]   = useState<UserRow[]>(initial)
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg]       = useState<{ id: string; ok: boolean; text?: string } | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  async function changeRole(userId: string, role: UserRole) {
    setSaving(userId); setMsg(null)
    const result = await updateUserRoleAction(userId, role)
    setSaving(null)
    if (result.ok) {
      setMsg({ id: userId, ok: true })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    } else {
      setMsg({ id: userId, ok: false, text: result.error })
    }
  }

  async function changeBranch(userId: string, branchId: string | null) {
    setSaving(userId); setMsg(null)
    const result = await assignUserBranch(userId, branchId)
    setSaving(null)
    if (result.ok) {
      setMsg({ id: userId, ok: true })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, branch_id: branchId } : u))
    } else {
      setMsg({ id: userId, ok: false, text: result.error })
    }
  }

  async function toggleCompanyAdmin(userId: string, companyId: string, isAdmin: boolean) {
    setSaving(userId); setMsg(null)
    const result = await toggleCompanyAdminAction(userId, companyId, isAdmin)
    setSaving(null)
    if (result.ok) {
      setMsg({ id: userId, ok: true })
      setUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        companies: u.companies.map(c => c.company_id === companyId ? { ...c, is_company_admin: isAdmin } : c)
      } : u))
    } else {
      setMsg({ id: userId, ok: false, text: result.error })
    }
  }

  async function addCompany(userId: string, companyId: string) {
    setSaving(userId); setMsg(null)
    const result = await addUserCompanyAction(userId, companyId)
    setSaving(null)
    if (result.ok) {
      setMsg({ id: userId, ok: true })
      const company = companies.find(c => c.id === companyId)
      setUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        companies: [...u.companies, { company_id: companyId, company_name: company?.name ?? '', is_company_admin: false }]
      } : u))
    } else {
      setMsg({ id: userId, ok: false, text: result.error })
    }
  }

  async function removeCompany(userId: string, companyId: string) {
    setSaving(userId); setMsg(null)
    const result = await removeUserCompanyAction(userId, companyId)
    setSaving(null)
    if (result.ok) {
      setMsg({ id: userId, ok: true })
      setUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        companies: u.companies.filter(c => c.company_id !== companyId)
      } : u))
    } else {
      setMsg({ id: userId, ok: false, text: result.error })
    }
  }

  async function deleteUser(userId: string, label: string) {
    if (!window.confirm(t('delete_confirm', { name: label }))) return
    setSaving(userId); setMsg(null)
    const result = await deleteUserAction(userId)
    setSaving(null)
    if (result.ok) {
      setUsers(prev => prev.filter(u => u.id !== userId))
    } else {
      setMsg({ id: userId, ok: false, text: result.error })
    }
  }

  const pending  = users.filter(u => u.companies.length === 0 && !isPiedroAdmin(u.role))
  const admins   = users.filter(u => isPiedroAdmin(u.role))
  const assigned = users.filter(u => u.companies.length > 0)

  const rowProps = {
    companies,
    branches,
    expandedUser,
    setExpandedUser,
    saving,
    msg,
    changeRole,
    changeBranch,
    toggleCompanyAdmin,
    addCompany,
    removeCompany,
    deleteUser,
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-lg font-semibold text-stone-900">{t('title')}</h1>

      {/* Piedro admins */}
      {admins.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold" />
            <h2 className="text-sm font-semibold text-stone-700">{t('section_admins', { count: admins.length })}</h2>
          </div>
          <div className="bg-white rounded-[14px] px-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            {admins.map(u => <Row key={u.id} u={u} {...rowProps} />)}
          </div>
        </section>
      )}

      {/* Pending (no company) */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-sm font-semibold text-stone-700">{t('section_pending', { count: pending.length })}</h2>
          </div>
          <div className="bg-white rounded-[14px] px-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            {pending.map(u => <Row key={u.id} u={u} {...rowProps} />)}
          </div>
        </section>
      )}

      {/* Assigned */}
      {assigned.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <h2 className="text-sm font-semibold text-stone-700">{t('section_active', { count: assigned.length })}</h2>
          </div>
          <div className="bg-white rounded-[14px] px-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            {assigned.map(u => <Row key={u.id} u={u} {...rowProps} />)}
          </div>
        </section>
      )}

      {users.length === 0 && (
        <p className="text-sm text-stone-400 text-center py-12">{t('no_users')}</p>
      )}
    </div>
  )
}
