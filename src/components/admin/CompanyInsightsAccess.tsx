'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { setCompanyInsightsEnabled } from '@/app/actions/admin-companies'

type Props = { companyId: string; initial: boolean }

export default function CompanyInsightsAccess({ companyId, initial }: Props) {
  const t = useTranslations('admin.companies')
  const router = useRouter()
  const [enabled, setEnabled] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function toggle(next: boolean) {
    setBusy(true); setMsg(null)
    const prev = enabled
    setEnabled(next)
    const res = await setCompanyInsightsEnabled(companyId, next)
    setBusy(false)
    if (res.error) { setEnabled(prev); setMsg(res.error); return }
    setMsg(t('insights_saved'))
    router.refresh()
  }

  return (
    <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('insights_title')}</h2>
        <p className="text-xs text-stone-400 mt-1">{t('insights_hint')}</p>
      </div>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" checked={enabled} disabled={busy}
          onChange={e => toggle(e.target.checked)}
          className="w-4 h-4 cursor-pointer custom-gold shrink-0" />
        <span className="text-sm text-stone-700">{t('insights_enable')}</span>
      </label>
      <p className="text-xs text-stone-400">
        {enabled ? t('insights_mode_on') : t('insights_mode_off')}
      </p>
      {msg && <span className="text-sm text-stone-500">{msg}</span>}
    </section>
  )
}
