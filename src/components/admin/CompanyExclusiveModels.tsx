'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { updateCompanyExclusiveLabel, setModelExclusiveLabel } from '@/app/actions/admin-companies'

type Company = { id: string; name: string; erp_code: string; exclusive_label: string | null }

type Props = {
  company: Company
  assignedModels: string[]
  freeModels: string[]
}

export default function CompanyExclusiveModels({ company, assignedModels, freeModels }: Props) {
  const t = useTranslations('admin.companies')
  const tc = useTranslations('admin.common')
  const router = useRouter()

  // ── Label ───────────────────────────────────────────────────────────────────
  const [label, setLabel] = useState(company.exclusive_label ?? '')
  const [savingLabel, setSavingLabel] = useState(false)
  const [labelMsg, setLabelMsg] = useState<string | null>(null)
  const savedLabel = (company.exclusive_label ?? '').trim().toUpperCase()

  async function saveLabel() {
    setSavingLabel(true); setLabelMsg(null)
    const res = await updateCompanyExclusiveLabel(company.id, label.trim().toUpperCase() || null)
    setSavingLabel(false)
    if (res.error) { setLabelMsg(res.error); return }
    setLabelMsg(tc('saved'))
    router.refresh()
  }

  // ── Models ────────────────────────────────────────────────────────────────────
  const [assigned, setAssigned] = useState<string[]>(assignedModels)
  const [free, setFree] = useState<string[]>(freeModels)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [modelErr, setModelErr] = useState<string | null>(null)

  const filteredFree = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return free.filter(m => !needle || m.toLowerCase().includes(needle)).slice(0, 200)
  }, [free, q])

  async function add(style: string) {
    setBusy(style); setModelErr(null)
    const res = await setModelExclusiveLabel(style, savedLabel)
    setBusy(null)
    if (res.error) { setModelErr(res.error); return }
    setAssigned(prev => [...prev, style].sort((a, b) => a.localeCompare(b)))
    setFree(prev => prev.filter(m => m !== style))
  }

  async function remove(style: string) {
    setBusy(style); setModelErr(null)
    const res = await setModelExclusiveLabel(style, null)
    setBusy(null)
    if (res.error) { setModelErr(res.error); return }
    setAssigned(prev => prev.filter(m => m !== style))
    setFree(prev => [...prev, style].sort((a, b) => a.localeCompare(b)))
  }

  return (
    <div className="space-y-6">
      {/* Exclusive label */}
      <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('label_section')}</h2>
        <p className="text-sm text-stone-500">{t('label_hint')}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('label_field')}</label>
            <input value={label} onChange={e => setLabel(e.target.value.toUpperCase())} placeholder="ABC"
              className="w-40 rounded-lg border border-stone-200 px-3 py-2 text-sm font-mono uppercase focus:border-gold focus:outline-none" />
          </div>
          <button onClick={saveLabel} disabled={savingLabel}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">
            {savingLabel ? tc('saving') : tc('save')}
          </button>
          {labelMsg && <span className="text-sm text-stone-500">{labelMsg}</span>}
        </div>
      </section>

      {/* Exclusive models */}
      <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('models_section')}</h2>
          <p className="text-xs text-stone-400">{t('models_count', { n: assigned.length })}</p>
        </div>

        {!savedLabel ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">{t('set_label_first')}</p>
        ) : (
          <>
            {modelErr && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{modelErr}</div>}

            {/* Currently assigned */}
            {assigned.length === 0 ? (
              <p className="text-sm text-stone-400">{t('no_models')}</p>
            ) : (
              <div className="rounded-lg border border-stone-100 divide-y divide-stone-50">
                {assigned.map(m => (
                  <div key={m} className="flex items-center gap-3 px-3 py-2">
                    <span className="flex-1 text-sm text-stone-700 font-mono">{m}</span>
                    <button onClick={() => remove(m)} disabled={busy === m}
                      className="text-sm font-medium text-red-500 hover:text-red-600 disabled:opacity-40">{tc('remove')}</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add free models */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('add_model')}</label>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('search_models')}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
              <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-stone-100 divide-y divide-stone-50">
                {filteredFree.map(m => (
                  <button key={m} onClick={() => add(m)} disabled={busy === m}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-stone-50 disabled:opacity-40">
                    <span className="flex-1 text-sm text-stone-700 font-mono">{m}</span>
                    <span className="text-xs font-medium text-gold">{tc('add')}</span>
                  </button>
                ))}
                {filteredFree.length === 0 && <p className="px-3 py-4 text-sm text-stone-400">{t('no_free_models')}</p>}
              </div>
              <p className="mt-1.5 text-[11px] text-stone-400">{t('add_hint')}</p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
