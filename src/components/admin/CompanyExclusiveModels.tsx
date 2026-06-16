'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import {
  addCompanyExclusiveSigla,
  removeCompanyExclusiveSigla,
  setModelExclusiveLabel,
} from '@/app/actions/admin-companies'
import { siglaColor } from '@/lib/exclusive-colors'

type Props = {
  companyId: string
  siglas: string[]
  assignedBySigla: Record<string, string[]>
  freeModels: string[]
}

export default function CompanyExclusiveModels({ companyId, siglas, assignedBySigla, freeModels }: Props) {
  const t = useTranslations('admin.companies')
  const tc = useTranslations('admin.common')
  const router = useRouter()

  // ── Siglas (company_exclusives, multi) ────────────────────────────────────────
  const [newSigla, setNewSigla] = useState('')
  const [busySigla, setBusySigla] = useState(false)
  const [siglaMsg, setSiglaMsg] = useState<string | null>(null)

  async function addSigla() {
    const value = newSigla.trim().toUpperCase()
    if (!value) return
    setBusySigla(true); setSiglaMsg(null)
    const res = await addCompanyExclusiveSigla(companyId, value)
    setBusySigla(false)
    if (res.error) { setSiglaMsg(res.error); return }
    setNewSigla('')
    router.refresh()
  }

  async function removeSigla(s: string) {
    setBusySigla(true); setSiglaMsg(null)
    const res = await removeCompanyExclusiveSigla(companyId, s)
    setBusySigla(false)
    if (res.error) { setSiglaMsg(res.error); return }
    router.refresh()
  }

  // ── Model ↔ sigla assignment (writes products.exclusive) ──────────────────────
  const [selected, setSelected] = useState<string>(siglas[0] ?? '')
  const [assigned, setAssigned] = useState<Record<string, string[]>>(assignedBySigla)
  const [free, setFree] = useState<string[]>(freeModels)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [modelErr, setModelErr] = useState<string | null>(null)

  const filteredFree = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return free.filter(m => !needle || m.toLowerCase().includes(needle)).slice(0, 200)
  }, [free, q])

  async function add(style: string) {
    if (!selected) return
    setBusy(style); setModelErr(null)
    const res = await setModelExclusiveLabel(style, selected)
    setBusy(null)
    if (res.error) { setModelErr(res.error); return }
    setAssigned(prev => ({ ...prev, [selected]: [...(prev[selected] ?? []), style].sort((a, b) => a.localeCompare(b)) }))
    setFree(prev => prev.filter(m => m !== style))
  }

  async function remove(style: string) {
    if (!selected) return
    setBusy(style); setModelErr(null)
    const res = await setModelExclusiveLabel(style, null)
    setBusy(null)
    if (res.error) { setModelErr(res.error); return }
    setAssigned(prev => ({ ...prev, [selected]: (prev[selected] ?? []).filter(m => m !== style) }))
    setFree(prev => [...prev, style].sort((a, b) => a.localeCompare(b)))
  }

  const selectedAssigned = assigned[selected] ?? []

  return (
    <div className="space-y-6">
      {/* Exclusive siglas */}
      <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('label_section')}</h2>
        <p className="text-sm text-stone-500">{t('label_hint')}</p>

        <div className="flex flex-wrap items-center gap-2">
          {siglas.length === 0 && <span className="text-sm text-stone-400">{t('no_company_siglas')}</span>}
          {siglas.map(s => {
            const color = siglaColor(s)
            return (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: `${color}22`, color: '#44403c' }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {s}
                <button onClick={() => removeSigla(s)} disabled={busySigla}
                  aria-label={`${tc('remove')} ${s}`}
                  className="ml-0.5 text-stone-400 hover:text-red-600 disabled:opacity-40">✕</button>
              </span>
            )
          })}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{t('label_field')}</label>
            <input value={newSigla} onChange={e => setNewSigla(e.target.value.toUpperCase())} placeholder="ABC"
              onKeyDown={e => { if (e.key === 'Enter') addSigla() }}
              className="w-40 rounded-lg border border-stone-200 px-3 py-2 text-sm font-mono uppercase focus:border-gold focus:outline-none" />
          </div>
          <button onClick={addSigla} disabled={busySigla || !newSigla.trim()}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">
            {busySigla ? tc('saving') : tc('add')}
          </button>
          {siglaMsg && <span className="text-sm text-red-500">{siglaMsg}</span>}
        </div>
      </section>

      {/* Exclusive models — tag which styles belong to a sigla (writes products.exclusive) */}
      <section className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('models_section')}</h2>
          {selected && <p className="text-xs text-stone-400">{t('models_count', { n: selectedAssigned.length })}</p>}
        </div>

        {siglas.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">{t('set_label_first')}</p>
        ) : (
          <>
            {/* Sigla selector (only when the company has more than one) */}
            {siglas.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {siglas.map(s => (
                  <button key={s} onClick={() => setSelected(s)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all
                      ${s === selected ? 'bg-stone-800 text-white border-stone-800' : 'text-stone-600 border-stone-200 hover:border-stone-400 bg-white'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {modelErr && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{modelErr}</div>}

            {/* Currently assigned to the selected sigla */}
            {selectedAssigned.length === 0 ? (
              <p className="text-sm text-stone-400">{t('no_models')}</p>
            ) : (
              <div className="rounded-lg border border-stone-100 divide-y divide-stone-50">
                {selectedAssigned.map(m => (
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
