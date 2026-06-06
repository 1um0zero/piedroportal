'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import {
  addUserCompanyAction, removeUserCompanyAction, toggleCompanyAdminAction,
} from '@/app/actions/admin-users'

export type Member = { id: string; email: string; full_name: string; is_company_admin: boolean }
export type UserOption = { id: string; email: string; full_name: string }

type Props = { companyId: string; members: Member[]; allUsers: UserOption[] }

export default function CompanyMembers({ companyId, members, allUsers }: Props) {
  const t = useTranslations('admin.companies')
  const tc = useTranslations('admin.common')
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [addId, setAddId] = useState('')

  const memberIds = new Set(members.map(m => m.id))
  const assignable = allUsers.filter(u => !memberIds.has(u.id))

  async function run(key: string, fn: () => Promise<{ error?: string }>) {
    setBusy(key)
    const res = await fn()
    setBusy(null)
    if (!res.error) router.refresh()
  }

  return (
    <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('members_title')}</h2>
        <p className="text-xs text-stone-400 mt-1">{t('members_hint')}</p>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-stone-400">{t('no_members')}</p>
      ) : (
        <div className="divide-y divide-stone-50">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{m.full_name || m.email}</p>
                <p className="text-xs text-stone-400 truncate">{m.email}</p>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
                <input type="checkbox" checked={m.is_company_admin} disabled={busy === `a${m.id}`}
                  onChange={e => run(`a${m.id}`, () => toggleCompanyAdminAction(m.id, companyId, e.target.checked))} />
                {t('admin_label')}
              </label>
              <button onClick={() => run(`r${m.id}`, () => removeUserCompanyAction(m.id, companyId))}
                disabled={busy === `r${m.id}`}
                className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-40">{tc('remove')}</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <select value={addId} onChange={e => setAddId(e.target.value)}
          className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none">
          <option value="">{t('add_placeholder')}</option>
          {assignable.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
        <button onClick={() => { if (addId) { run('add', () => addUserCompanyAction(addId, companyId)); setAddId('') } }}
          disabled={!addId || busy === 'add'}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">{tc('add')}</button>
      </div>
    </section>
  )
}
