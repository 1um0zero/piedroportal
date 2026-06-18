'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { setCompanySeesGeneralCatalogue } from '@/app/actions/admin-companies'

type Props = { companyId: string; initial: boolean }

export default function CompanyCatalogueAccess({ companyId, initial }: Props) {
  const t = useTranslations('admin.companies')
  const router = useRouter()
  const [seesGeneral, setSeesGeneral] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function toggle(next: boolean) {
    setBusy(true); setMsg(null)
    const prev = seesGeneral
    setSeesGeneral(next)
    const res = await setCompanySeesGeneralCatalogue(companyId, next)
    setBusy(false)
    if (res.error) { setSeesGeneral(prev); setMsg(res.error); return }
    setMsg(t('catalogue_saved'))
    router.refresh()
  }

  return (
    <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('catalogue_title')}</h2>
        <p className="text-xs text-stone-400 mt-1">{t('catalogue_hint')}</p>
      </div>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" checked={seesGeneral} disabled={busy}
          onChange={e => toggle(e.target.checked)}
          className="w-4 h-4 cursor-pointer custom-gold shrink-0" />
        <span className="text-sm text-stone-700">{t('catalogue_sees_general')}</span>
      </label>
      <p className="text-xs text-stone-400">
        {seesGeneral ? t('catalogue_mode_general') : t('catalogue_mode_exclusive')}
      </p>
      {msg && <span className="text-sm text-stone-500">{msg}</span>}
    </section>
  )
}
