'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import {
  addCompanyExclusiveSigla,
  removeCompanyExclusiveSigla,
  setColoursExclusiveToken,
} from '@/app/actions/admin-companies'
import { siglaColor } from '@/lib/exclusive-colors'
import ExclusiveColourGrid, { type GridStyle } from '@/components/admin/ExclusiveColourGrid'

/** A style with its colours; `tokens` = the siglas currently on each colour row. */
export type CatalogueStyle = { style: string; colours: { id: string; name: string; tokens: string[] }[] }

type Props = {
  companyId: string
  siglas: string[]
  catalogue: CatalogueStyle[]
}

export default function CompanyExclusiveModels({ companyId, siglas, catalogue }: Props) {
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

  // ── Model ↔ sigla assignment (Style → Colour grid, per-colour & additive) ─────
  const [selected, setSelected] = useState<string>(siglas[0] ?? '')
  // colourId → set of siglas currently on it (local source of truth across switches)
  const [tokensById, setTokensById] = useState<Map<string, Set<string>>>(
    () => new Map(catalogue.flatMap(s => s.colours.map(c => [c.id, new Set(c.tokens)]))),
  )

  const gridStyles: GridStyle[] = useMemo(
    () => catalogue.map(s => ({
      style: s.style,
      colours: s.colours.map(c => ({
        id: c.id, name: c.name, on: tokensById.get(c.id)?.has(selected) ?? false,
      })),
    })),
    [catalogue, tokensById, selected],
  )

  async function applyToken(colourIds: string[], on: boolean) {
    const res = await setColoursExclusiveToken(colourIds, selected, on)
    if (!res.error) {
      setTokensById(prev => {
        const n = new Map(prev)
        for (const id of colourIds) {
          const set = new Set(n.get(id) ?? [])
          if (on) set.add(selected); else set.delete(selected)
          n.set(id, set)
        }
        return n
      })
    }
    return res
  }

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

      {/* Exclusive models — Style → Colour grid for the selected sigla */}
      {siglas.length === 0 ? (
        <section className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">{t('set_label_first')}</p>
        </section>
      ) : (
        <div className="space-y-3">
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
          <ExclusiveColourGrid key={selected} token={selected} styles={gridStyles} onApply={applyToken} />
        </div>
      )}
    </div>
  )
}
