'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import {
  updateBranch, deleteBranch, setBranchModel, removeBranchModel, assignUserBranch,
} from '@/app/actions/admin-branches'
import type { Branch } from '@/types'

export type BranchUser = {
  id: string
  email: string
  full_name: string
  role: string
  branch_id: string | null
}

type Props = {
  branch: Branch
  allModels: string[]
  assignedModels: string[]
  users: BranchUser[]
}

export default function BranchDetail({ branch, allModels, assignedModels, users }: Props) {
  const t = useTranslations('admin.branches')
  const tc = useTranslations('admin.common')
  const router = useRouter()

  // ── Settings ────────────────────────────────────────────────────────────────
  const [name, setName] = useState(branch.name)
  const [code, setCode] = useState(branch.code ?? '')
  const [seesFull, setSeesFull] = useState(branch.sees_full_catalogue)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null)

  async function saveSettings() {
    setSavingSettings(true); setSettingsMsg(null)
    const res = await updateBranch(branch.id, { name, code: code || null, sees_full_catalogue: seesFull })
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
    </div>
  )
}
