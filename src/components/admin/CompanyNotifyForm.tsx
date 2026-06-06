'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { updateCompanyNotify } from '@/app/actions/admin-companies'

type Props = { companyId: string; initialCc: string; initialBcc: string }

export default function CompanyNotifyForm({ companyId, initialCc, initialBcc }: Props) {
  const t = useTranslations('admin.companies')
  const router = useRouter()
  const [cc, setCc] = useState(initialCc)
  const [bcc, setBcc] = useState(initialBcc)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    setBusy(true); setMsg(null)
    const res = await updateCompanyNotify(companyId, { notify_cc: cc, notify_bcc: bcc })
    setBusy(false)
    setMsg(res.error ?? t('notify_saved'))
    if (!res.error) router.refresh()
  }

  return (
    <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('notify_title')}</h2>
        <p className="text-xs text-stone-400 mt-1">{t('notify_hint')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('notify_cc')}</label>
          <input value={cc} onChange={e => setCc(e.target.value)} placeholder="a@x.com, b@y.com"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('notify_bcc')}</label>
          <input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="archive@x.com"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy}
          className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">
          {t('notify_save')}
        </button>
        {msg && <span className="text-sm text-stone-500">{msg}</span>}
      </div>
    </section>
  )
}
