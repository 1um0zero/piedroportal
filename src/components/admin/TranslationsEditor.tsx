'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import {
  saveTranslationRows, saveShoeColours, recomposeBasicColours,
  type TransRow, type ShoeColourRow,
} from '@/app/actions/admin-translations'

export type { TransRow }
export type ShoeRow = ShoeColourRow

type TransTab = 'construction' | 'closure' | 'type' | 'colour' | 'colourwords'
type SectionId = TransTab | 'shoe'

type Props = {
  construction: TransRow[]
  closure: TransRow[]
  type: TransRow[]
  colour: TransRow[]
  colourWords: TransRow[]
  shoeColours: ShoeRow[]
}

const LANGS = ['en', 'nl', 'fr', 'de'] as const
// Which DB category each tab writes to.
const CATEGORY: Record<TransTab, string> = {
  construction: 'construction', closure: 'closure', type: 'type',
  colour: 'colour', colourwords: 'colour_word',
}

export default function TranslationsEditor(props: Props) {
  const t = useTranslations('adminTranslations')
  const router = useRouter()

  const [tab, setTab] = useState<SectionId>('construction')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [recomposing, setRecomposing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [trans, setTrans] = useState<Record<TransTab, TransRow[]>>({
    construction: props.construction.map(r => ({ ...r })),
    closure: props.closure.map(r => ({ ...r })),
    type: props.type.map(r => ({ ...r })),
    colour: props.colour.map(r => ({ ...r })),
    colourwords: props.colourWords.map(r => ({ ...r })),
  })
  const [shoe, setShoe] = useState<ShoeRow[]>(props.shoeColours.map(r => ({ ...r })))

  const initial = useMemo(() => ({
    construction: JSON.stringify(props.construction),
    closure: JSON.stringify(props.closure),
    type: JSON.stringify(props.type),
    colour: JSON.stringify(props.colour),
    colourwords: JSON.stringify(props.colourWords),
    shoe: JSON.stringify(props.shoeColours),
  }), [props])

  const isShoe = tab === 'shoe'
  const transTab = tab as TransTab
  const showRecompose = tab === 'colour' || tab === 'colourwords'

  const SECTIONS: { id: SectionId; label: string; count: number }[] = [
    { id: 'construction', label: t('construction'), count: props.construction.length },
    { id: 'closure', label: t('closure'), count: props.closure.length },
    { id: 'type', label: t('type'), count: props.type.length },
    { id: 'colour', label: t('basic_colours'), count: props.colour.length },
    { id: 'colourwords', label: t('colour_words'), count: props.colourWords.length },
    { id: 'shoe', label: t('shoe_colours'), count: props.shoeColours.length },
  ]

  const q = search.trim().toLowerCase()
  const visibleTrans = useMemo(
    () => isShoe ? [] : trans[transTab].filter(r =>
      !q || (r.label ?? r.key).toLowerCase().includes(q) || [r.en, r.nl, r.fr, r.de].some(v => v.toLowerCase().includes(q))),
    [isShoe, trans, transTab, q],
  )
  const visibleShoe = useMemo(
    () => !isShoe ? [] : shoe.filter(r =>
      !q || r.color_name.toLowerCase().includes(q) || [r.nl, r.fr, r.de].some(v => v.toLowerCase().includes(q))),
    [isShoe, shoe, q],
  )

  function updTrans(key: string, lang: typeof LANGS[number], value: string) {
    setTrans(prev => ({
      ...prev,
      [transTab]: prev[transTab].map(r => r.key === key ? { ...r, [lang]: value } : r),
    }))
  }
  function updShoe(name: string, lang: 'nl' | 'fr' | 'de', value: string) {
    setShoe(prev => prev.map(r => r.color_name === name ? { ...r, [lang]: value } : r))
  }

  async function save() {
    setBusy(true); setMsg(null)
    let res: { ok?: boolean; error?: string }
    if (isShoe) {
      const before = new Map(props.shoeColours.map(r => [r.color_name, JSON.stringify(r)]))
      const changed = shoe.filter(r => before.get(r.color_name) !== JSON.stringify(r))
      res = changed.length ? await saveShoeColours(changed) : { ok: true }
    } else {
      // Compare only the editable translation cells, so a colour is flagged
      // `manual` only when a cell was actually edited.
      const sig = (r: TransRow) => JSON.stringify([r.en, r.nl, r.fr, r.de])
      const original = (props as unknown as Record<string, TransRow[]>)[transTab === 'colourwords' ? 'colourWords' : transTab]
      const before = new Map(original.map(r => [r.key, sig(r)]))
      const changed = trans[transTab].filter(r => before.get(r.key) !== sig(r))
      res = changed.length ? await saveTranslationRows(CATEGORY[transTab], changed) : { ok: true }
    }
    setBusy(false)
    setMsg(res.error ?? t('saved'))
    if (!res.error) router.refresh()
  }

  async function recompose() {
    setRecomposing(true); setMsg(null)
    const res = await recomposeBasicColours()
    setRecomposing(false)
    if (res.error) { setMsg(res.error); return }
    const miss = res.missing?.length ? ` · ${t('missing_words', { words: res.missing.join(', ') })}` : ''
    setMsg(t('recomposed', { n: res.updated ?? 0 }) + miss)
    router.refresh()
  }

  const dirty = isShoe
    ? JSON.stringify(shoe) !== initial.shoe
    : JSON.stringify(trans[transTab]) !== initial[transTab]

  const firstColLabel = isShoe ? t('colour_name') : tab === 'colourwords' ? t('word') : t('value')

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold text-stone-800 mb-1">{t('title')}</h1>
      <p className="text-sm text-stone-500 mb-6">{t('description')}</p>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => { setTab(s.id); setSearch(''); setMsg(null) }}
            className={`px-3.5 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5
              ${tab === s.id ? 'bg-gold text-white' : 'bg-white text-stone-500 hover:text-stone-800 border border-stone-200'}`}>
            {s.label}
            <span className={`text-[10px] font-bold px-1.5 rounded-full ${tab === s.id ? 'bg-white/25' : 'bg-stone-100 text-stone-400'}`}>{s.count}</span>
          </button>
        ))}
      </div>

      {/* Search + actions */}
      <div className="flex items-center gap-3 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
          className="h-9 flex-1 max-w-xs rounded-lg border border-stone-200 px-3 text-sm focus:border-gold focus:outline-none" />
        <div className="ml-auto flex items-center gap-3">
          {msg && <span className="text-sm text-stone-500">{msg}</span>}
          {showRecompose && (
            <button onClick={recompose} disabled={recomposing} title={t('recompose_hint')}
              className="rounded-lg border border-gold px-3 py-2 text-sm font-semibold text-gold hover:bg-gold/10 disabled:opacity-40 flex items-center gap-2">
              {recomposing && <span className="w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />}
              {t('recompose')}
            </button>
          )}
          <button onClick={save} disabled={busy || !dirty}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">
            {busy ? t('saving') : t('save')}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-px bg-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-400">
          <div className="bg-white px-3 py-2">{firstColLabel}</div>
          {LANGS.map(l => <div key={l} className="bg-white px-3 py-2">{l.toUpperCase()}</div>)}
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-stone-50">
          {isShoe ? (
            visibleShoe.map(r => (
              <div key={r.color_name} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] items-center gap-2 px-3 py-1.5">
                <span className="text-sm text-stone-700 truncate" title={r.color_name}>{r.color_name}</span>
                <span className="text-xs text-stone-300 px-2">—</span>
                {(['nl', 'fr', 'de'] as const).map(l => (
                  <input key={l} value={r[l]} onChange={e => updShoe(r.color_name, l, e.target.value)}
                    className="h-8 rounded-md border border-stone-200 px-2 text-sm focus:border-gold focus:outline-none" />
                ))}
              </div>
            ))
          ) : (
            visibleTrans.map(r => (
              <div key={r.key} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] items-center gap-2 px-3 py-1.5">
                <span className="text-sm font-medium text-stone-700 truncate flex items-center gap-1.5" title={r.label ?? r.key}>
                  {r.label ?? r.key}
                  {r.manual && <span className="text-[9px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-1.5 rounded">{t('manual')}</span>}
                </span>
                {LANGS.map(l => (
                  <input key={l} value={r[l]} onChange={e => updTrans(r.key, l, e.target.value)}
                    className="h-8 rounded-md border border-stone-200 px-2 text-sm focus:border-gold focus:outline-none" />
                ))}
              </div>
            ))
          )}
          {(isShoe ? visibleShoe.length : visibleTrans.length) === 0 && (
            <div className="px-3 py-10 text-center text-sm text-stone-400">{t('no_results')}</div>
          )}
        </div>
      </div>

      <p className="text-xs text-stone-400 mt-3">{showRecompose ? t('colour_hint') : t('hint')}</p>
    </div>
  )
}
