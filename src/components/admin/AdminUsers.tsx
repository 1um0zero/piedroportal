'use client'

import { useState } from 'react'
import { updateUserRoleAction, toggleCompanyAdminAction, addUserCompanyAction, removeUserCompanyAction } from '@/app/actions/admin-users'

type UserRole = 'user' | 'company_admin' | 'piedro_admin'

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
  created_at: string
}

type Company = { id: string; name: string }
type Props   = { users: UserRow[]; companies: Company[] }

const ROLE_LABELS: Record<UserRole, string> = {
  user:          'User',
  company_admin: 'Company Admin',
  piedro_admin:  'Piedro Admin',
}
const ROLE_COLORS: Record<UserRole, string> = {
  user:          'bg-stone-100 text-stone-600',
  company_admin: 'bg-blue-50 text-blue-600',
  piedro_admin:  'bg-gold/10 text-gold',
}

export default function AdminUsers({ users: initial, companies }: Props) {
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

  const pending  = users.filter(u => u.companies.length === 0 && u.role !== 'piedro_admin')
  const admins   = users.filter(u => u.role === 'piedro_admin')
  const assigned = users.filter(u => u.companies.length > 0)

  function Row({ u }: { u: UserRow }) {
    const isExpanded = expandedUser === u.id
    const userCompanyIds = new Set(u.companies.map(c => c.company_id))
    const [searchQuery, setSearchQuery] = useState('')
    const [showAll, setShowAll] = useState(false)

    // Filter companies based on search and toggle
    const filteredCompanies = companies.filter(company => {
      const isMember = userCompanyIds.has(company.id)
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase())

      if (showAll) {
        return matchesSearch  // Show all that match search
      } else {
        return isMember && matchesSearch  // Show only assigned that match search
      }
    })

    return (
      <div className="py-3.5 border-b border-stone-50 last:border-0 space-y-2.5">
        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800 truncate">{u.full_name || '—'}</p>
            <p className="text-xs text-stone-400 truncate">{u.email}</p>
          </div>
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
          {/* Role chips */}
          <div className="flex gap-1">
            {(['user', 'piedro_admin'] as UserRole[]).map(role => (
              <button key={role}
                onClick={() => u.role !== role && changeRole(u.id, role)}
                disabled={saving === u.id}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all disabled:opacity-50
                  ${u.role === role
                    ? `${ROLE_COLORS[role]} border-current`
                    : 'text-stone-400 border-stone-200 hover:border-stone-400 bg-white'}`}>
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          {/* Companies summary + toggle */}
          {u.role !== 'piedro_admin' && (
            <>
              <span className="text-xs text-stone-500">
                {u.companies.length === 0 ? 'No companies' : `${u.companies.length} ${u.companies.length === 1 ? 'company' : 'companies'}`}
              </span>
              <button
                onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                className="text-xs text-gold hover:text-gold-dark font-medium">
                {isExpanded ? '▲ Hide' : '▼ Manage'}
              </button>
            </>
          )}
        </div>

        {/* Expanded: Company management */}
        {isExpanded && u.role !== 'piedro_admin' && (
          <div className="mt-3 p-3 bg-stone-50 rounded-lg space-y-3">
            {/* Header with filters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Companies</p>

                {/* Toggle: Only assigned / All */}
                <button
                  onClick={() => setShowAll(!showAll)}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all
                    ${showAll
                      ? 'bg-gold/10 text-gold border-gold'
                      : 'bg-white text-stone-500 border-stone-300 hover:border-stone-400'}`}>
                  {showAll ? `All (${companies.length})` : `Assigned (${u.companies.length})`}
                </button>
              </div>

              {/* Search input */}
              <input
                type="text"
                placeholder="Search companies..."
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
                  {searchQuery ? 'No companies found' : (showAll ? 'No companies available' : 'No assigned companies')}
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
                          title={uc.is_company_admin ? 'Remove company admin' : 'Make company admin'}>
                          Admin
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

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-lg font-semibold text-stone-900">User Management</h1>

      {/* Piedro admins */}
      {admins.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold" />
            <h2 className="text-sm font-semibold text-stone-700">Piedro Admins ({admins.length})</h2>
          </div>
          <div className="bg-white rounded-[14px] px-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            {admins.map(u => <Row key={u.id} u={u} />)}
          </div>
        </section>
      )}

      {/* Pending (no company) */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-sm font-semibold text-stone-700">Pending approval ({pending.length})</h2>
          </div>
          <div className="bg-white rounded-[14px] px-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            {pending.map(u => <Row key={u.id} u={u} />)}
          </div>
        </section>
      )}

      {/* Assigned */}
      {assigned.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <h2 className="text-sm font-semibold text-stone-700">Active users ({assigned.length})</h2>
          </div>
          <div className="bg-white rounded-[14px] px-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            {assigned.map(u => <Row key={u.id} u={u} />)}
          </div>
        </section>
      )}

      {users.length === 0 && (
        <p className="text-sm text-stone-400 text-center py-12">No users registered yet.</p>
      )}
    </div>
  )
}
