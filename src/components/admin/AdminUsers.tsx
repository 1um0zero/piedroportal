'use client'

import { useState } from 'react'
import { updateUserRoleAction } from '@/app/actions/admin-users'

type UserRole = 'user' | 'company_admin' | 'piedro_admin'

type UserRow = {
  id: string
  email: string
  full_name: string
  role: UserRole
  company_id: string | null
  company_name: string | null
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

  async function assignCompany(userId: string, companyId: string | null) {
    setSaving(userId); setMsg(null)
    const res = await fetch('/api/admin/assign-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, companyId }),
    })
    setSaving(null)
    if (res.ok) {
      setMsg({ id: userId, ok: true })
      setUsers(prev => prev.map(u => u.id === userId
        ? { ...u, company_id: companyId, company_name: companies.find(c => c.id === companyId)?.name ?? null }
        : u))
    } else {
      setMsg({ id: userId, ok: false, text: 'Failed' })
    }
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

  const pending  = users.filter(u => !u.company_id && u.role !== 'piedro_admin')
  const admins   = users.filter(u => u.role === 'piedro_admin')
  const assigned = users.filter(u => u.company_id)

  function Row({ u }: { u: UserRow }) {
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

          {/* Company select — only for non-piedro-admin */}
          {u.role !== 'piedro_admin' && (
            <select
              defaultValue={u.company_id ?? ''}
              onChange={e => assignCompany(u.id, e.target.value || null)}
              disabled={saving === u.id}
              className="h-7 px-2 pr-7 text-xs bg-white border border-stone-200 rounded-lg
                         text-stone-700 appearance-none cursor-pointer
                         focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                         disabled:opacity-50">
              <option value="">— No company —</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
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
