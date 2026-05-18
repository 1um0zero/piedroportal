'use client'

import { useState } from 'react'

type UserRow = {
  id: string
  email: string
  full_name: string
  company_id: string | null
  company_name: string | null
  created_at: string
}

type Company = { id: string; name: string }

type Props = { users: UserRow[]; companies: Company[] }

export default function AdminUsers({ users: initial, companies }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initial)
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ id: string; ok: boolean } | null>(null)

  async function assign(userId: string, companyId: string | null) {
    setSaving(userId)
    setMsg(null)

    const res = await fetch('/api/admin/assign-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, companyId }),
    })

    setSaving(null)
    if (res.ok) {
      setMsg({ id: userId, ok: true })
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                company_id: companyId,
                company_name: companies.find((c) => c.id === companyId)?.name ?? null,
              }
            : u,
        ),
      )
    } else {
      setMsg({ id: userId, ok: false })
    }
  }

  const pending = users.filter((u) => !u.company_id)
  const assigned = users.filter((u) => u.company_id)

  function UserRow({ u }: { u: UserRow }) {
    return (
      <div className="flex items-center gap-4 py-3 border-b border-stone-100 last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 truncate">
            {u.full_name || '—'}
          </p>
          <p className="text-xs text-stone-400 truncate">{u.email}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            defaultValue={u.company_id ?? ''}
            onChange={(e) => assign(u.id, e.target.value || null)}
            disabled={saving === u.id}
            className="h-8 px-2 pr-7 text-xs bg-white border border-stone-200 rounded-lg
                       text-stone-700 appearance-none cursor-pointer
                       focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                       disabled:opacity-50"
          >
            <option value="">— Sem empresa —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {saving === u.id && (
            <span className="w-4 h-4 border-2 border-stone-200 border-t-gold
                             rounded-full animate-spin" />
          )}
          {msg?.id === u.id && (
            <span className={`text-xs font-medium ${msg.ok ? 'text-green-500' : 'text-red-500'}`}>
              {msg.ok ? '✓' : '✗'}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-lg font-semibold text-stone-900">
        Gestão de Utilizadores
      </h1>

      {/* Pending */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-sm font-semibold text-stone-700">
              Sem empresa associada ({pending.length})
            </h2>
          </div>
          <div className="bg-white rounded-[14px] px-4 divide-y divide-stone-50"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            {pending.map((u) => <UserRow key={u.id} u={u} />)}
          </div>
        </section>
      )}

      {/* Assigned */}
      {assigned.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <h2 className="text-sm font-semibold text-stone-700">
              Com empresa ({assigned.length})
            </h2>
          </div>
          <div className="bg-white rounded-[14px] px-4 divide-y divide-stone-50"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            {assigned.map((u) => <UserRow key={u.id} u={u} />)}
          </div>
        </section>
      )}

      {users.length === 0 && (
        <p className="text-sm text-stone-400 text-center py-12">
          Sem utilizadores registados.
        </p>
      )}
    </div>
  )
}
