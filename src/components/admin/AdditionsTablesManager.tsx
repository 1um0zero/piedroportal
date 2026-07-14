'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from '@/i18n/navigation'
import { additionOptionImageUrl } from '@/lib/additions/option-image'
import { ADDITION_TABLES, type AdditionOption } from '@/lib/additions/option-tables'
import {
  saveAdditionOption,
  deleteAdditionOption,
  reorderAdditionOptions,
  uploadAdditionOptionImage,
  removeAdditionOptionImage,
} from '@/app/actions/admin-additions'

type Groups = Record<string, AdditionOption[]>

/**
 * /admin/additions — "Additions – Tabelas". Four editable option lists
 * (PU/EVA Bumper, Sole, Runner sole, Spoiler). PHASE 1: the order form still
 * reads the static config, so edits here don't yet change the customer view —
 * this is the editable source we'll wire up in a later phase.
 */
export default function AdditionsTablesManager({ groups: initial }: { groups: Groups }) {
  const router = useRouter()
  const [groups, setGroups] = useState<Groups>(initial)
  const [tab, setTab] = useState<string>(ADDITION_TABLES[0].key)
  const [error, setError] = useState<string | null>(null)

  const rows = groups[tab] ?? []

  const patchRow = (id: string, patch: Partial<AdditionOption>) =>
    setGroups(g => ({ ...g, [tab]: (g[tab] ?? []).map(r => (r.id === id ? { ...r, ...patch } : r)) }))

  const removeRowLocal = (id: string) =>
    setGroups(g => ({ ...g, [tab]: (g[tab] ?? []).filter(r => r.id !== id) }))

  const move = async (index: number, dir: -1 | 1) => {
    const list = [...(groups[tab] ?? [])]
    const j = index + dir
    if (j < 0 || j >= list.length) return
    ;[list[index], list[j]] = [list[j], list[index]]
    setGroups(g => ({ ...g, [tab]: list }))
    const res = await reorderAdditionOptions(tab, list.map(r => r.id))
    if (res.error) { setError(res.error); router.refresh() }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Additions — Tabelas</h1>
        <p className="mt-1 text-sm text-stone-500">
          Editable option lists for the sole-amendment fields. Create, edit, disable, reorder
          options and upload an image per option.
        </p>
        <p className="mt-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Fase 1 — estas tabelas são a fonte editável; o formulário de encomenda ainda lê da
          configuração estática, por isso <strong>editar aqui ainda não altera o que o cliente vê</strong>.
          A ligação ao form (e a associação a modelos) vem numa fase seguinte.
        </p>
      </header>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {ADDITION_TABLES.map(t => {
          const count = (groups[t.key] ?? []).length
          const on = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(null) }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border
                ${on ? 'bg-gold text-white border-gold' : 'bg-white text-stone-600 border-stone-200 hover:border-gold'}`}
            >
              {t.label} <span className={on ? 'opacity-80' : 'text-stone-400'}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] border border-stone-100" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="grid grid-cols-[auto_56px_1fr_1fr_auto_auto] gap-3 items-center px-4 py-3 border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          <span>Order</span>
          <span>Image</span>
          <span>Value</span>
          <span>Family</span>
          <span>Active</span>
          <span></span>
        </div>

        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-stone-400">No options yet.</div>
        )}

        {rows.map((row, i) => (
          <OptionRow
            key={row.id}
            row={row}
            index={i}
            total={rows.length}
            onMove={move}
            onPatch={patchRow}
            onRemove={removeRowLocal}
            onError={setError}
          />
        ))}

        <AddRow fieldKey={tab} onAdded={(r) => setGroups(g => ({ ...g, [tab]: [...(g[tab] ?? []), r] }))} onError={setError} />
      </div>
    </div>
  )
}

// ── Single option row ────────────────────────────────────────────────────────
function OptionRow({
  row, index, total, onMove, onPatch, onRemove, onError,
}: {
  row: AdditionOption
  index: number
  total: number
  onMove: (index: number, dir: -1 | 1) => void
  onPatch: (id: string, patch: Partial<AdditionOption>) => void
  onRemove: (id: string) => void
  onError: (msg: string | null) => void
}) {
  const [value, setValue] = useState(row.value)
  const [family, setFamily] = useState(row.family ?? '')
  const [labelNl, setLabelNl] = useState(row.label_nl ?? '')
  const [labelFr, setLabelFr] = useState(row.label_fr ?? '')
  const [labelDe, setLabelDe] = useState(row.label_de ?? '')
  const [showI18n, setShowI18n] = useState(false)
  const [bust, setBust] = useState<number>(0)
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const dirty =
    value !== row.value ||
    (family || '') !== (row.family ?? '') ||
    (labelNl || '') !== (row.label_nl ?? '') ||
    (labelFr || '') !== (row.label_fr ?? '') ||
    (labelDe || '') !== (row.label_de ?? '')

  const save = () => start(async () => {
    onError(null)
    const res = await saveAdditionOption({
      id: row.id, field_key: row.field_key, value,
      family, label_nl: labelNl, label_fr: labelFr, label_de: labelDe, active: row.active,
    })
    if (res.error) return onError(res.error)
    onPatch(row.id, { value, family: family || null, label_nl: labelNl || null, label_fr: labelFr || null, label_de: labelDe || null })
  })

  const toggleActive = () => start(async () => {
    onError(null)
    const res = await saveAdditionOption({
      id: row.id, field_key: row.field_key, value: row.value, family: row.family,
      label_nl: row.label_nl, label_fr: row.label_fr, label_de: row.label_de, active: !row.active,
    })
    if (res.error) return onError(res.error)
    onPatch(row.id, { active: !row.active })
  })

  const del = () => {
    if (!confirm(`Delete option "${row.value}"?`)) return
    start(async () => {
      onError(null)
      const res = await deleteAdditionOption(row.id)
      if (res.error) return onError(res.error)
      onRemove(row.id)
    })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    start(async () => {
      onError(null)
      const fd = new FormData()
      fd.set('id', row.id)
      fd.set('file', file)
      const res = await uploadAdditionOptionImage(fd)
      if (res.error) return onError(res.error)
      onPatch(row.id, { image_path: res.path ?? row.image_path })
      setBust(Date.now())
    })
    e.target.value = ''
  }

  const removeImg = () => start(async () => {
    onError(null)
    const res = await removeAdditionOptionImage(row.id)
    if (res.error) return onError(res.error)
    onPatch(row.id, { image_path: null })
  })

  const baseUrl = additionOptionImageUrl(row.image_path)
  const imgUrl = baseUrl ? (bust ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${bust}` : baseUrl) : null

  return (
    <div className={`border-b border-stone-50 ${row.active ? '' : 'opacity-55'} ${pending ? 'pointer-events-none opacity-70' : ''}`}>
      <div className="grid grid-cols-[auto_56px_1fr_1fr_auto_auto] gap-3 items-center px-4 py-2.5">
        {/* Order */}
        <div className="flex flex-col text-stone-300">
          <button onClick={() => onMove(index, -1)} disabled={index === 0} className="hover:text-gold disabled:opacity-30 leading-none">▲</button>
          <button onClick={() => onMove(index, 1)} disabled={index === total - 1} className="hover:text-gold disabled:opacity-30 leading-none">▼</button>
        </div>

        {/* Image */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          <button
            onClick={() => fileRef.current?.click()}
            title={imgUrl ? 'Replace image' : 'Upload image'}
            className="w-11 h-11 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center overflow-hidden hover:border-gold"
          >
            {imgUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={imgUrl} alt={row.value} className="w-full h-full object-contain" />
              : <span className="text-stone-300 text-lg">＋</span>}
          </button>
          {imgUrl && (
            <button onClick={removeImg} className="block mt-0.5 text-[10px] text-stone-400 hover:text-red-600">remove</button>
          )}
        </div>

        {/* Value */}
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          className="w-full text-sm px-2 py-1.5 rounded-lg border border-transparent hover:border-stone-200 focus:border-gold focus:outline-none"
        />

        {/* Family */}
        <input
          value={family}
          onChange={e => setFamily(e.target.value)}
          placeholder="—"
          className="w-full text-sm text-stone-500 px-2 py-1.5 rounded-lg border border-transparent hover:border-stone-200 focus:border-gold focus:outline-none"
        />

        {/* Active */}
        <button
          onClick={toggleActive}
          className={`relative w-9 h-5 rounded-full transition-colors ${row.active ? 'bg-gold' : 'bg-stone-300'}`}
          title={row.active ? 'Active' : 'Disabled'}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${row.active ? 'left-4.5' : 'left-0.5'}`} style={{ left: row.active ? '1.125rem' : '0.125rem' }} />
        </button>

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => setShowI18n(s => !s)} title="Translations" className={`text-sm ${showI18n ? 'text-gold' : 'text-stone-400 hover:text-stone-700'}`}>🌐</button>
          {dirty && <button onClick={save} className="text-xs font-semibold text-white bg-gold hover:bg-gold-dark rounded-lg px-2.5 py-1">Save</button>}
          <button onClick={del} title="Delete" className="text-stone-300 hover:text-red-600 text-sm">🗑</button>
        </div>
      </div>

      {showI18n && (
        <div className="grid grid-cols-3 gap-2 px-4 pb-3 pl-[4.75rem]">
          {[['NL', labelNl, setLabelNl], ['FR', labelFr, setLabelFr], ['DE', labelDe, setLabelDe]].map(([lab, val, set]) => (
            <label key={lab as string} className="text-[11px] text-stone-400">
              <span className="block mb-0.5">{lab as string}</span>
              <input
                value={val as string}
                onChange={e => (set as (v: string) => void)(e.target.value)}
                placeholder="(English)"
                className="w-full text-sm px-2 py-1 rounded-lg border border-stone-200 focus:border-gold focus:outline-none"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add-new row ──────────────────────────────────────────────────────────────
function AddRow({
  fieldKey, onAdded, onError,
}: {
  fieldKey: string
  onAdded: (row: AdditionOption) => void
  onError: (msg: string | null) => void
}) {
  const [value, setValue] = useState('')
  const [family, setFamily] = useState('')
  const [pending, start] = useTransition()

  const add = () => {
    if (!value.trim()) return
    start(async () => {
      onError(null)
      const res = await saveAdditionOption({ field_key: fieldKey, value, family, active: true })
      if (res.error) return onError(res.error)
      onAdded({
        id: res.id!, field_key: fieldKey, value: value.trim(), family: family.trim() || null,
        sort_order: 9999, image_path: null, label_nl: null, label_fr: null, label_de: null,
        active: true, created_at: '', updated_at: '',
      })
      setValue(''); setFamily('')
    })
  }

  return (
    <div className="grid grid-cols-[auto_56px_1fr_1fr_auto_auto] gap-3 items-center px-4 py-3 bg-stone-50/60 rounded-b-[14px]">
      <span className="text-stone-300 text-lg pl-1">＋</span>
      <span />
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') add() }}
        placeholder="New option value…"
        className="w-full text-sm px-2 py-1.5 rounded-lg border border-stone-200 focus:border-gold focus:outline-none"
      />
      <input
        value={family}
        onChange={e => setFamily(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') add() }}
        placeholder="Family (optional)"
        className="w-full text-sm px-2 py-1.5 rounded-lg border border-stone-200 focus:border-gold focus:outline-none"
      />
      <span />
      <button
        onClick={add}
        disabled={pending || !value.trim()}
        className="text-xs font-semibold text-white bg-gold hover:bg-gold-dark disabled:opacity-40 rounded-lg px-3 py-1.5 justify-self-end"
      >
        Add
      </button>
    </div>
  )
}
