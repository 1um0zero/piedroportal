'use client'

import { useState } from 'react'
import { useTranslations, useLocale, useFormatter, useNow } from 'next-intl'
import { updateUserRoleAction, toggleCompanyAdminAction, addUserCompanyAction, removeUserCompanyAction, deleteUserAction, generateAccessLinkAction, updateUserApproveOrdersAction } from '@/app/actions/admin-users'
import { assignUserBranch } from '@/app/actions/admin-branches'
import { startImpersonation } from '@/app/actions/impersonation'
import { isPiedroAdmin, isBranchStaff, isBranchAdmin, isStaffViewer } from '@/lib/roles'
import AdminUsersGrid from './AdminUsersGrid'

type UserRole = 'user' | 'company_admin' | 'piedro_admin' | 'branch_staff' | 'branch_admin' | 'super_admin' | 'staff_viewer'

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
  can_approve_orders: boolean
  confirmed: boolean
  last_sign_in: string | null
}

/** Roles that don't need a company assignment, so must never be treated as
 *  "pending approval": branch roles (operate via their branch) and the global
 *  staff_viewer (read-only consultant of all orders). */
const isNonCompanyRole = (role: string) =>
  isBranchStaff(role) || isBranchAdmin(role) || isStaffViewer(role)

type Company = { id: string; name: string }
type BranchOpt = { id: string; name: string }
type Props   = { users: UserRow[]; companies: Company[]; branches: BranchOpt[] }

const ROLE_COLORS: Record<UserRole, string> = {
  user:          'bg-stone-100 text-stone-600',
  company_admin: 'bg-blue-50 text-blue-600',
  piedro_admin:  'bg-gold/10 text-gold',
  branch_staff:  'bg-emerald-50 text-emerald-600',
  branch_admin:  'bg-teal-50 text-teal-600',
  super_admin:   'bg-stone-800 text-white',
  staff_viewer:  'bg-purple-50 text-purple-600',
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
  toggleApproveOrders: (userId: string, canApprove: boolean) => void
  toggleCompanyAdmin: (userId: string, companyId: string, isAdmin: boolean) => void
  addCompany: (userId: string, companyId: string) => void
  removeCompany: (userId: string, companyId: string) => void
  deleteUser: (userId: string, label: string) => void
  generateLink: (userId: string) => void
  linkLoading: string | null
  linkData: { id: string; link: string } | null
}

function Row({ u, companies, branches, expandedUser, setExpandedUser, saving, msg, changeRole, changeBranch, toggleApproveOrders, toggleCompanyAdmin, addCompany, removeCompany, deleteUser, generateLink, linkLoading, linkData }: RowProps) {
  const t = useTranslations('admin.users')
  const ti = useTranslations('impersonation')
  const locale = useLocale()
  const format = useFormatter()
  const now = useNow()
  const isExpanded = expandedUser === u.id
  const userCompanyIds = new Set(u.companies.map(c => c.company_id))
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [copied, setCopied] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const showLink = linkData?.id === u.id

  // Step into this user's real session to validate their permissions. Hard-reload
  // to the gallery so the server re-reads the swapped session cookies.
  const viewAs = async () => {
    setImpersonating(true)
    const res = await startImpersonation(u.id)
    if (res.error) { setImpersonating(false); alert(res.error); return }
    window.location.replace(`/${locale}/gallery`)
  }

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
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-stone-800 truncate">{u.full_name || '—'}</p>
            {!u.confirmed && !isPiedroAdmin(u.role) && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-500 uppercase tracking-wide"
                title={t('awaiting_hint')}>
                {t('not_confirmed')}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400 truncate">{u.email}</p>
          <p className="text-[11px] text-stone-300 truncate">
            {u.last_sign_in
              ? t('last_login', { when: format.relativeTime(new Date(u.last_sign_in), now) })
              : t('last_login_never')}
          </p>
        </div>
        {/* View as — step into this user's real session to validate permissions */}
        {!isPiedroAdmin(u.role) && (
          <button
            onClick={viewAs}
            disabled={impersonating}
            title={ti('view_as_hint')}
            className="shrink-0 inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-semibold border border-gold/40 text-gold hover:bg-gold/10 transition-colors disabled:opacity-50">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {impersonating ? ti('starting') : ti('view_as')}
          </button>
        )}
        {/* Generate a direct login link (email-bypass) for support cases */}
        <button
          onClick={() => generateLink(u.id)}
          disabled={linkLoading === u.id}
          title={t('access_link_title')}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-stone-300 hover:text-gold hover:bg-gold/10 transition-colors disabled:opacity-50">
          {linkLoading === u.id ? (
            <span className="w-3.5 h-3.5 border-2 border-stone-200 border-t-gold rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          )}
        </button>
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

      {/* Generated access link — copy & hand to the customer directly */}
      {showLink && linkData && (
        <div className="p-3 bg-gold/5 border border-gold/20 rounded-lg space-y-2">
          <p className="text-[11px] font-semibold text-stone-600 uppercase tracking-wide">{t('access_link_title')}</p>
          <p className="text-xs text-stone-500">{t('access_link_desc')}</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={linkData.link}
              onFocus={e => e.target.select()}
              className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-lg text-stone-700 font-mono"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(linkData.link); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className="shrink-0 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-gold text-white hover:bg-gold-dark transition-colors">
              {copied ? t('access_link_copied') : t('access_link_copy')}
            </button>
          </div>
          <p className="text-[11px] text-stone-400">{t('access_link_expires')}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Role chips (super_admin is assigned via CLI, shown as a static badge) */}
        <div className="flex gap-1">
          {u.role === 'super_admin' || u.role === 'branch_admin' ? (
            // Assigned elsewhere (super_admin via CLI; branch_admin from the branch
            // page's "branch admins" panel). Shown read-only so it isn't silently
            // clobbered by clicking another role chip.
            <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg ${ROLE_COLORS[u.role]}`} title={t('role_managed_elsewhere')}>
              {t(`role_${u.role}`)}
            </span>
          ) : (['user', 'branch_staff', 'staff_viewer', 'piedro_admin'] as UserRole[]).map(role => (
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

        {/* Granular capability — let this branch_staff approve orders + set the
            Piedro Order # (within their model scope), without any other admin power. */}
        {u.role === 'branch_staff' && (
          <button
            onClick={() => toggleApproveOrders(u.id, !u.can_approve_orders)}
            disabled={saving === u.id}
            title={u.can_approve_orders ? t('approve_orders_on_hint') : t('approve_orders_off_hint')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all disabled:opacity-50
              ${u.can_approve_orders
                ? 'bg-emerald-50 text-emerald-700 border-emerald-600'
                : 'text-stone-400 border-stone-200 hover:border-stone-400 bg-white'}`}>
            {u.can_approve_orders ? `✓ ${t('approve_orders')}` : t('approve_orders')}
          </button>
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
  const [view, setView] = useState<'cards' | 'grid'>('cards')
  const [q, setQ] = useState('')
  const [linkLoading, setLinkLoading] = useState<string | null>(null)
  const [linkData, setLinkData] = useState<{ id: string; link: string } | null>(null)

  async function generateLink(userId: string) {
    setLinkLoading(userId); setMsg(null)
    if (linkData?.id === userId) { setLinkData(null); setLinkLoading(null); return } // toggle off
    const result = await generateAccessLinkAction(userId)
    setLinkLoading(null)
    if (result.ok && result.link) setLinkData({ id: userId, link: result.link })
    else setMsg({ id: userId, ok: false, text: result.error })
  }

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

  async function toggleApproveOrders(userId: string, canApprove: boolean) {
    setSaving(userId); setMsg(null)
    const result = await updateUserApproveOrdersAction(userId, canApprove)
    setSaving(null)
    if (result.ok) {
      setMsg({ id: userId, ok: true })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, can_approve_orders: canApprove } : u))
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

  // Cards-view search across name, email and company names.
  const needle = q.trim().toLowerCase()
  const matchesQ = (u: UserRow) =>
    !needle ||
    `${u.full_name} ${u.email} ${u.companies.map(c => c.company_name).join(' ')}`.toLowerCase().includes(needle)
  const visible  = users.filter(matchesQ)
  // Gate A — not yet confirmed their email (never activated the account). Distinct
  // from "pending approval", which is a confirmed user still awaiting a company.
  const awaiting = visible.filter(u => !u.confirmed && !isPiedroAdmin(u.role))
  // Pending = confirmed, company-based role (NOT branch/viewer) with no company yet.
  const pending  = visible.filter(u => u.confirmed && u.companies.length === 0 && !isPiedroAdmin(u.role) && !isNonCompanyRole(u.role))
  const admins   = visible.filter(u => isPiedroAdmin(u.role))
  // Active = confirmed and either has a company or is a branch/viewer role (assigned by role).
  const assigned = visible.filter(u => u.confirmed && !isPiedroAdmin(u.role) && (u.companies.length > 0 || isNonCompanyRole(u.role)))

  const rowProps = {
    companies,
    branches,
    expandedUser,
    setExpandedUser,
    saving,
    msg,
    changeRole,
    changeBranch,
    toggleApproveOrders,
    toggleCompanyAdmin,
    addCompany,
    removeCompany,
    deleteUser,
    generateLink,
    linkLoading,
    linkData,
  }

  return (
    <div className={`${view === 'grid' ? 'max-w-7xl' : 'max-w-3xl'} mx-auto px-6 py-8 space-y-8`}>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-stone-900">{t('title')}</h1>
        {/* View toggle: cards (edit) / grid (validate) */}
        <div className="flex rounded-lg border border-stone-200 overflow-hidden text-[11px] font-semibold">
          {(['cards', 'grid'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 transition-colors ${view === v
                ? 'bg-gold/10 text-gold'
                : 'bg-white text-stone-400 hover:text-stone-600'}`}>
              {t(`view_${v}`)}
            </button>
          ))}
        </div>
      </div>

      {view === 'grid' && <AdminUsersGrid users={users} branches={branches} />}

      {view === 'cards' && (<>
      {/* Search across all sections (name / email / company) */}
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder={t('grid_search')}
        className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-stone-700 placeholder-stone-400
                   focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
      />

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

      {/* Awaiting email confirmation (Gate A — never activated the account) */}
      {awaiting.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <h2 className="text-sm font-semibold text-stone-700">{t('section_awaiting', { count: awaiting.length })}</h2>
          </div>
          <p className="text-xs text-stone-400 -mt-1">{t('awaiting_hint')}</p>
          <div className="bg-white rounded-[14px] px-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            {awaiting.map(u => <Row key={u.id} u={u} {...rowProps} />)}
          </div>
        </section>
      )}

      {/* Pending (confirmed, no company) */}
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
      {users.length > 0 && visible.length === 0 && (
        <p className="text-sm text-stone-400 text-center py-12">{t('grid_no_results')}</p>
      )}
      </>)}
    </div>
  )
}
