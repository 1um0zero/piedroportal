'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import {
  updateBranch, deleteBranch, setBranchModel, removeBranchModel, assignUserBranch,
  addBranchCompany, removeBranchCompany, addBranchAdmin, removeBranchAdmin,
} from '@/app/actions/admin-branches'
import type { Branch } from '@/types'

export type BranchUser = {
  id: string
  email: string
  full_name: string
  role: string
  branch_id: string | null
}

export type BranchCompanyOption = {
  id: string
  name: string
  erp_code: string
}

type Props = {
  branch: Branch
  allModels: string[]
  assignedModels: string[]
  users: BranchUser[]
  allCompanies: BranchCompanyOption[]
  assignedCompanyIds: string[]
  branchAdminIds: string[]
}

export default function BranchDetail({
  branch, allModels, assignedModels, users,
  allCompanies, assignedCompanyIds, branchAdminIds,
}: Props) {
  const t = useTranslations('admin.branches')
  const tc = useTranslations('admin.common')
  const router = useRouter()

  // ── Settings ────────────────────────────────────────────────────────────────
  const [name, setName] = useState(branch.name)
  const [code, setCode] = useState(branch.code ?? '')
  const [seesFull, setSeesFull] = useState(branch.sees_full_catalogue)
  const [handlesUnassigned, setHandlesUnassigned] = useState(!!branch.handles_unassigned_clients)
  const [notifyEmail, setNotifyEmail] = useState(branch.notify_email ?? '')
  const [notifyLocale, setNotifyLocale] = useState(branch.notify_locale ?? 'en')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)

  async function saveSettings() {
    setSavingSettings(true); setSettingsMsg(null)
    const res = await updateBranch(branch.id, {
      name, code: code || null, sees_full_catalogue: seesFull,
      handles_unassigned_clients: handlesUnassigned,
      notify_email: notifyEmail || null, notify_locale: notifyLocale,
    })
    setSavingSettings(false)
    setSettingsMsg(res.error ?? tc('saved'))
    if (!res.error) router.refresh()
  }

  async function onDelete() {
    if (!confirm(t('confirm_delete'))) return
    const res = await deleteBranch(branch.id)
    if (res.error) { setSettingsMsg(res.error); return }
    router.push('/admin/branches')
  }

  // ── Models ──────────────────────────────────────────────────────────────────
  const [assigned, setAssigned] = useState<Set<string>>(new Set(assignedModels))
  const [q, setQ] = useState('')
  const [busyModel, setBusyModel] = useState<string | null>(null)

  const filteredModels = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return allModels.filter(m => !needle || m.toLowerCase().includes(needle))
  }, [allModels, q])

  async function toggleModel(style: string) {
    const has = assigned.has(style)
    setBusyModel(style)
    const res = has ? await removeBranchModel(branch.id, style) : await setBranchModel(branch.id, style)
    setBusyModel(null)
    if (!res.error) {
      setAssigned(prev => {
        const next = new Set(prev)
        if (has) next.delete(style); else next.add(style)
        return next
      })
    }
  }

  // ── Staff ───────────────────────────────────────────────────────────────────
  const [staffBranch, setStaffBranch] = useState<Map<string, string | null>>(
    new Map(users.map(u => [u.id, u.branch_id])),
  )
  const [addUserId, setAddUserId] = useState('')
  const [busyStaff, setBusyStaff] = useState<string | null>(null)

  const current = users.filter(u => staffBranch.get(u.id) === branch.id)
  const assignable = users.filter(u => staffBranch.get(u.id) !== branch.id)

  async function setUserBranch(userId: string, toBranch: string | null) {
    setBusyStaff(userId)
    const res = await assignUserBranch(userId, toBranch)
    setBusyStaff(null)
    if (!res.error) setStaffBranch(prev => new Map(prev).set(userId, toBranch))
  }

  // ── Clients (companies) ───────────────────────────────────────────────────────
  const [clients, setClients] = useState<Set<string>>(new Set(assignedCompanyIds))
  const [clientQ, setClientQ] = useState('')
  const [busyClient, setBusyClient] = useState<string | null>(null)

  const assignedClients = useMemo(
    () => allCompanies.filter(c => clients.has(c.id)), [allCompanies, clients],
  )
  const assignableClients = useMemo(() => {
    const needle = clientQ.trim().toLowerCase()
    return allCompanies.filter(c =>
      !clients.has(c.id) &&
      (!needle || c.name.toLowerCase().includes(needle) || c.erp_code.toLowerCase().includes(needle)))
  }, [allCompanies, clients, clientQ])

  async function addClient(companyId: string) {
    setBusyClient(companyId)
    const res = await addBranchCompany(branch.id, companyId)
    setBusyClient(null)
    if (!res.error) { setClients(prev => new Set(prev).add(companyId)); setClientQ('') }
  }
  async function removeClient(companyId: string) {
    setBusyClient(companyId)
    const res = await removeBranchCompany(branch.id, companyId)
    setBusyClient(null)
    if (!res.error) setClients(prev => { const n = new Set(prev); n.delete(companyId); return n })
  }

  // ── Branch admins (N:N) ───────────────────────────────────────────────────────
  const [admins, setAdmins] = useState<Set<string>>(new Set(branchAdminIds))
  const [addAdminId, setAddAdminId] = useState('')
  const [busyAdmin, setBusyAdmin] = useState<string | null>(null)

  const adminUsers = useMemo(() => users.filter(u => admins.has(u.id)), [users, admins])
  const assignableAdmins = useMemo(() => users.filter(u => !admins.has(u.id)), [users, admins])

  async function addAdmin(userId: string) {
    setBusyAdmin(userId)
    const res = await addBranchAdmin(branch.id, userId)
    setBusyAdmin(null)
    if (!res.error) { setAdmins(prev => new Set(prev).add(userId)); setAddAdminId('') }
  }
  async function removeAdmin(userId: string) {
    setBusyAdmin(userId)
    const res = await removeBranchAdmin(branch.id, userId)
    setBusyAdmin(null)
    if (!res.error) setAdmins(prev => { const n = new Set(prev); n.delete(userId); return n })
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <section className="bg-white rounded-[14px] p-6 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('settings')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('field_name')}</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('field_code')}</label>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="NL"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{t('field_catalogue')}</label>
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="radio" name="catmode" checked={seesFull} onChange={() => setSeesFull(true)} className="mt-1" />
              <span className="text-sm text-stone-700">{t('mode_full')} <span className="text-stone-400">— {t('mode_full_hint')}</span></span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="radio" name="catmode" checked={!seesFull} onChange={() => setSeesFull(false)} className="mt-1" />
              <span className="text-sm text-stone-700">{t('mode_limited')} <span className="text-stone-400">— {t('mode_limited_hint')}</span></span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{t('clients')}</label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={handlesUnassigned} onChange={e => setHandlesUnassigned(e.target.checked)} className="mt-1" />
            <span className="text-sm text-stone-700">{t('catch_all')} <span className="text-stone-400">— {t('catch_all_hint')}</span></span>
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('field_notify_email')}</label>
            <input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="orders.nl@piedro.com"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('field_notify_locale')}</label>
            <select value={notifyLocale} onChange={e => setNotifyLocale(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none">
              {['en', 'nl', 'fr', 'de'].map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-stone-400 -mt-1">{t('field_notify_hint')}</p>

        <div className="flex items-center gap-3">
          <button onClick={saveSettings} disabled={savingSettings || !name.trim()}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">
            {savingSettings ? t('saving') : tc('save')}
          </button>
          {settingsMsg && <span className="text-sm text-stone-500">{settingsMsg}</span>}
          <button onClick={onDelete} className="ml-auto text-sm font-medium text-red-500 hover:text-red-600">{t('delete_branch')}</button>
        </div>
      </section>

      {/* Models */}
      <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('models')}</h2>
          <p className="text-xs text-stone-400">
            {seesFull ? t('models_exclude_hint') : t('models_include_hint')} · {t('selected_n', { n: assigned.size })}
          </p>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('search_models')}
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
        <div className="max-h-80 overflow-y-auto rounded-lg border border-stone-100 divide-y divide-stone-50">
          {filteredModels.map(m => {
            const on = assigned.has(m)
            return (
              <label key={m} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-stone-50">
                <input type="checkbox" checked={on} disabled={busyModel === m} onChange={() => toggleModel(m)} />
                <span className="text-sm text-stone-700 font-mono">{m}</span>
              </label>
            )
          })}
          {filteredModels.length === 0 && <p className="px-3 py-4 text-sm text-stone-400">{t('no_models')}</p>}
        </div>
      </section>

      {/* Staff */}
      <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('staff')}</h2>

        {current.length === 0 ? (
          <p className="text-sm text-stone-400">{t('no_staff')}</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {current.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-stone-400 truncate">{u.email}{u.role !== 'branch_staff' && ` · ${u.role}`}</p>
                </div>
                <button onClick={() => setUserBranch(u.id, null)} disabled={busyStaff === u.id}
                  className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-40">{tc('remove')}</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
            className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none">
            <option value="">{t('add_staff_placeholder')}</option>
            {assignable.map(u => (
              <option key={u.id} value={u.id}>{(u.full_name || u.email)}{staffBranch.get(u.id) ? ` (${t('reassign')})` : ''}</option>
            ))}
          </select>
          <button onClick={() => { if (addUserId) { setUserBranch(addUserId, branch.id); setAddUserId('') } }}
            disabled={!addUserId}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">{tc('add')}</button>
        </div>
        <p className="text-xs text-stone-400">{t('staff_role_hint')}</p>
      </section>

      {/* Clients (companies this branch's admins may order/view on behalf of) */}
      <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('clients')}</h2>
          <p className="text-xs text-stone-400">{t('clients_hint')} · {t('selected_n', { n: clients.size })}</p>
        </div>

        {branch.handles_unassigned_clients && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{t('catch_all_active')}</p>
        )}

        {assignedClients.length === 0 ? (
          <p className="text-sm text-stone-400">{t('no_clients')}</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {assignedClients.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{c.name}</p>
                  {c.erp_code && <p className="text-xs text-stone-400 truncate font-mono">{c.erp_code}</p>}
                </div>
                <button onClick={() => removeClient(c.id)} disabled={busyClient === c.id}
                  className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-40">{tc('remove')}</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <input value={clientQ} onChange={e => setClientQ(e.target.value)} placeholder={t('search_clients')}
            className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
        </div>
        {clientQ.trim() && (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-100 divide-y divide-stone-50">
            {assignableClients.slice(0, 50).map(c => (
              <button key={c.id} type="button" onClick={() => addClient(c.id)} disabled={busyClient === c.id}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-stone-50 disabled:opacity-40">
                <span className="flex-1 min-w-0 truncate text-sm text-stone-700">{c.name}</span>
                {c.erp_code && <span className="text-xs text-stone-400 font-mono">{c.erp_code}</span>}
                <span className="text-gold text-sm font-semibold">{tc('add')}</span>
              </button>
            ))}
            {assignableClients.length === 0 && <p className="px-3 py-4 text-sm text-stone-400">{t('no_clients_found')}</p>}
          </div>
        )}
      </section>

      {/* Branch admins (may create/view orders for the branch's clients) */}
      <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('branch_admins')}</h2>

        {adminUsers.length === 0 ? (
          <p className="text-sm text-stone-400">{t('no_branch_admins')}</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {adminUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-stone-400 truncate">{u.email}</p>
                </div>
                <button onClick={() => removeAdmin(u.id)} disabled={busyAdmin === u.id}
                  className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-40">{tc('remove')}</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <select value={addAdminId} onChange={e => setAddAdminId(e.target.value)}
            className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none">
            <option value="">{t('add_branch_admin_placeholder')}</option>
            {assignableAdmins.map(u => (
              <option key={u.id} value={u.id}>{(u.full_name || u.email)}</option>
            ))}
          </select>
          <button onClick={() => { if (addAdminId) addAdmin(addAdminId) }} disabled={!addAdminId || busyAdmin === addAdminId}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">{tc('add')}</button>
        </div>
        <p className="text-xs text-stone-400">{t('branch_admins_hint')}</p>
      </section>
    </div>
  )
}
