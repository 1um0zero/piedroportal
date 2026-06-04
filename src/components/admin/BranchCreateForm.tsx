'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createBranch } from '@/app/actions/admin-branches'

export default function BranchCreateForm() {
  const t = useTranslations('admin.branches')
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [seesFull, setSeesFull] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setError(null)
    const res = await createBranch({ name, code: code || null, sees_full_catalogue: seesFull })
    setBusy(false)
    if (res.error) { setError(res.error); return }
    router.push(`/admin/branches/${res.id}`)
  }

  return (
    <div className="bg-white rounded-[14px] p-6 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div>
        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('field_name')}</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('field_code')}</label>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="NL"
          className="w-40 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
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

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button onClick={submit} disabled={busy || !name.trim()}
        className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">
        {busy ? t('saving') : t('create')}
      </button>
    </div>
  )
}
