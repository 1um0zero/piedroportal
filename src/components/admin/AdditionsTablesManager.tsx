'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { additionOptionImageUrl } from '@/lib/additions/option-image'
import { ADDITION_TABLES, type AdditionOption, type AdditionForm } from '@/lib/additions/option-tables'
import {
  saveAdditionOption,
  deleteAdditionOption,
  reorderAdditionOptions,
  uploadAdditionOptionImage,
  removeAdditionOptionImage,
  syncAdditionOptionsFromConfig,
} from '@/app/actions/admin-additions'

type Groups = Record<string, AdditionOption[]>
type View = 'table' | 'cards'

const FORM_LABELS: Record<AdditionForm, string> = { standard: 'Pair-by-Pair', osb: 'OSB / Custom' }
const FORMS = [...new Set(ADDITION_TABLES.map(t => t.form))] as AdditionForm[]

// The server always re-normalises to a 700 px square, so large originals only
// waste bandwidth and can blow the Server Action body limit / Vercel's ~4.5 MB
// platform cap. Downscale big photos in the browser first (mirrors the product
// image uploader). EXIF orientation is baked in; PNG preserves transparency.
const MAX_UPLOAD_DIM = 1600
const SIZE_THRESHOLD = 1_500_000 // bytes; below this, send untouched
async function prepareForUpload(file: File): Promise<File> {
  if (file.size <= SIZE_THRESHOLD) return file
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_UPLOAD_DIM / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bmp, 0, 0, w, h)
    bmp.close?.()
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' })
  } catch {
    return file // fall back to the original; the server may still accept it
  }
}

/**
 * /admin/additions — "Additions – Tabelas". Four editable option lists
 * (PU/EVA Bumper, Sole, Runner sole), viewable as a compact table or a
 * photo-card grid. PHASE 1: the order form still reads the static config, so
 * edits here don't yet change the customer view — this is the editable source
 * we'll wire up in a later phase.
 */
export default function AdditionsTablesManager({ groups: initial }: { groups: Groups }) {
  const router = useRouter()
  const [groups, setGroups] = useState<Groups>(initial)
  const [form, setForm] = useState<AdditionForm>(ADDITION_TABLES[0].form)
  const [tab, setTab] = useState<string>(ADDITION_TABLES[0].key)
  const [view, setView] = useState<View>('table')
  const [error, setError] = useState<string | null>(null)
  const [syncing, startSync] = useTransition()
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  // Safety net: prevent the browser from navigating to (opening) a file dropped
  // anywhere on the page — a drop that misses a card's exact drop zone would
  // otherwise unload the app ("This page couldn't load"). The card's own onDrop
  // still handles real uploads; this only cancels the browser default.
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault()
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  // Reflect fresh server data after router.refresh() (e.g. after a config sync).
  // React's "adjust state during render" pattern (no effect → no cascading-render
  // warning); row components keyed by id keep their own draft state across this.
  const [prevInitial, setPrevInitial] = useState(initial)
  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setGroups(initial)
  }

  const rows = groups[tab] ?? []

  const patchRow = (id: string, patch: Partial<AdditionOption>) =>
    setGroups(g => ({ ...g, [tab]: (g[tab] ?? []).map(r => (r.id === id ? { ...r, ...patch } : r)) }))

  const removeRowLocal = (id: string) =>
    setGroups(g => ({ ...g, [tab]: (g[tab] ?? []).filter(r => r.id !== id) }))

  const addRowLocal = (r: AdditionOption) =>
    setGroups(g => ({ ...g, [tab]: [...(g[tab] ?? []), r] }))

  const move = async (index: number, dir: -1 | 1) => {
    const list = [...(groups[tab] ?? [])]
    const j = index + dir
    if (j < 0 || j >= list.length) return
    ;[list[index], list[j]] = [list[j], list[index]]
    setGroups(g => ({ ...g, [tab]: list }))
    const res = await reorderAdditionOptions(tab, list.map(r => r.id))
    if (res.error) { setError(res.error); router.refresh() }
  }

  const handlers = { onMove: move, onPatch: patchRow, onRemove: removeRowLocal, onError: setError }

  // Fields of the active form, grouped by their sub-heading (in registry order).
  const formFields = ADDITION_TABLES.filter(t => t.form === form)
  const groupOrder = [...new Set(formFields.map(t => t.group))]

  const selectForm = (f: AdditionForm) => {
    setForm(f); setError(null)
    const first = ADDITION_TABLES.find(t => t.form === f)
    if (first) setTab(first.key)
  }

  const runSync = () => startSync(async () => {
    setSyncMsg(null); setError(null)
    const res = await syncAdditionOptionsFromConfig()
    if (res.error) return setError(res.error)
    setSyncMsg(res.added ? `Added ${res.added} option(s) from config.` : 'Already up to date with config.')
    router.refresh()
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Additions — Tabelas</h1>
            <p className="mt-1 text-sm text-stone-500">
              Editable option lists for the Standard and OSB forms. Create, edit, disable, reorder
              options and upload an image per option.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={runSync}
              disabled={syncing}
              title="Insert any options defined in the form config that are missing here (never overwrites edits)"
              className="text-sm font-medium text-stone-600 border border-stone-200 rounded-full px-4 py-1.5 hover:border-gold hover:text-stone-900 disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync from config'}
            </button>
            {/* View toggle */}
            <div className="inline-flex rounded-full border border-stone-200 bg-white p-0.5 text-sm">
              {(['table', 'cards'] as View[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 rounded-full font-medium transition-colors
                    ${view === v ? 'bg-gold text-white' : 'text-stone-500 hover:text-stone-900'}`}
                >
                  {v === 'table' ? 'Table' : 'Cards'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {syncMsg && <p className="mt-3 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{syncMsg}</p>}
        <p className="mt-3 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Fase 1 — estas tabelas são a fonte editável; os formulários de encomenda ainda leem da
          configuração estática, por isso <strong>editar aqui ainda não altera o que o cliente vê</strong>.
          A ligação aos forms (e a associação a modelos) vem numa fase seguinte. Usa <strong>Sync from
          config</strong> para popular campos novos a partir do config.
        </p>
      </header>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Form selector */}
      {FORMS.length > 1 && (
        <div className="inline-flex rounded-full border border-stone-200 bg-white p-0.5 text-sm mb-4">
          {FORMS.map(f => (
            <button
              key={f}
              onClick={() => selectForm(f)}
              className={`px-5 py-1.5 rounded-full font-semibold transition-colors
                ${form === f ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'}`}
            >
              {FORM_LABELS[f]}
            </button>
          ))}
        </div>
      )}

      {/* Grouped tabs for the active form */}
      <div className="space-y-3 mb-5">
        {groupOrder.map(grp => (
          <div key={grp} className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 w-28 shrink-0">{grp}</span>
            {formFields.filter(t => t.group === grp).map(t => {
              const count = (groups[t.key] ?? []).length
              const on = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setError(null) }}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border inline-flex items-center gap-1.5
                    ${on ? 'bg-gold text-white border-gold' : 'bg-white text-stone-600 border-stone-200 hover:border-gold'}`}
                >
                  {t.hasImages && <span className={on ? 'opacity-80' : 'text-stone-300'}>🖼</span>}
                  {t.label} <span className={on ? 'opacity-80' : 'text-stone-400'}>({count})</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {view === 'table' ? (
        <div className="bg-white rounded-[14px] border border-stone-100" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="grid grid-cols-[auto_56px_1fr_1fr_auto_auto] gap-3 items-center px-4 py-3 border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            <span>Order</span><span>Image</span><span>Value</span><span>Family</span><span>Active</span><span></span>
          </div>
          {rows.length === 0 && <div className="px-4 py-8 text-center text-sm text-stone-400">No options yet.</div>}
          {rows.map((row, i) => (
            <OptionRow key={row.id} row={row} index={i} total={rows.length} {...handlers} />
          ))}
          <AddRow fieldKey={tab} onAdded={addRowLocal} onError={setError} variant="table" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {rows.map((row, i) => (
            <OptionCard key={row.id} row={row} index={i} total={rows.length} {...handlers} />
          ))}
          <AddRow fieldKey={tab} onAdded={addRowLocal} onError={setError} variant="card" />
        </div>
      )}
    </div>
  )
}

// ── Shared per-option editor state + handlers ────────────────────────────────
interface RowHandlers {
  onMove: (index: number, dir: -1 | 1) => void
  onPatch: (id: string, patch: Partial<AdditionOption>) => void
  onRemove: (id: string) => void
  onError: (msg: string | null) => void
}

function useOptionEditor(row: AdditionOption, { onPatch, onRemove, onError }: RowHandlers) {
  const [value, setValue] = useState(row.value)
  const [family, setFamily] = useState(row.family ?? '')
  const [labelNl, setLabelNl] = useState(row.label_nl ?? '')
  const [labelFr, setLabelFr] = useState(row.label_fr ?? '')
  const [labelDe, setLabelDe] = useState(row.label_de ?? '')
  const [bust, setBust] = useState(0)
  const [pending, start] = useTransition()

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

  const uploadFile = (file: File) => {
    if (!file.type.startsWith('image/')) return onError('File must be an image')
    start(async () => {
      onError(null)
      const prepared = await prepareForUpload(file)
      const fd = new FormData()
      fd.set('id', row.id)
      fd.set('file', prepared)
      const res = await uploadAdditionOptionImage(fd)
      if (res.error) return onError(res.error)
      onPatch(row.id, { image_path: res.path ?? row.image_path })
      setBust(Date.now())
    })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
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

  return {
    value, setValue, family, setFamily,
    labelNl, setLabelNl, labelFr, setLabelFr, labelDe, setLabelDe,
    dirty, pending, imgUrl,
    save, toggleActive, del, onFile, uploadFile, removeImg,
  }
}

// ── i18n sub-panel (shared) ──────────────────────────────────────────────────
function I18nFields({ ed }: { ed: ReturnType<typeof useOptionEditor> }) {
  const rows: Array<[string, string, (v: string) => void]> = [
    ['NL', ed.labelNl, ed.setLabelNl], ['FR', ed.labelFr, ed.setLabelFr], ['DE', ed.labelDe, ed.setLabelDe],
  ]
  return (
    <div className="grid grid-cols-3 gap-2">
      {rows.map(([lab, val, set]) => (
        <label key={lab} className="text-[11px] text-stone-400">
          <span className="block mb-0.5">{lab}</span>
          <input value={val} onChange={e => set(e.target.value)} placeholder="(English)"
            className="w-full text-sm px-2 py-1 rounded-lg border border-stone-200 focus:border-gold focus:outline-none" />
        </label>
      ))}
    </div>
  )
}

function ActiveToggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} title={active ? 'Active' : 'Disabled'}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${active ? 'bg-gold' : 'bg-stone-300'}`}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: active ? '1.125rem' : '0.125rem' }} />
    </button>
  )
}

// ── Table row ────────────────────────────────────────────────────────────────
function OptionRow({ row, index, total, ...h }: { row: AdditionOption; index: number; total: number } & RowHandlers) {
  const ed = useOptionEditor(row, h)
  const [showI18n, setShowI18n] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className={`border-b border-stone-50 ${row.active ? '' : 'opacity-55'} ${ed.pending ? 'pointer-events-none opacity-70' : ''}`}>
      <div className="grid grid-cols-[auto_56px_1fr_1fr_auto_auto] gap-3 items-center px-4 py-2.5">
        <div className="flex flex-col text-stone-300">
          <button onClick={() => h.onMove(index, -1)} disabled={index === 0} className="hover:text-gold disabled:opacity-30 leading-none">▲</button>
          <button onClick={() => h.onMove(index, 1)} disabled={index === total - 1} className="hover:text-gold disabled:opacity-30 leading-none">▼</button>
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={ed.onFile} />
          <button onClick={() => fileRef.current?.click()} title={ed.imgUrl ? 'Replace image' : 'Upload image'}
            className="w-11 h-11 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center overflow-hidden hover:border-gold">
            {ed.imgUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={ed.imgUrl} alt={row.value} className="w-full h-full object-contain" />
              : <span className="text-stone-300 text-lg">＋</span>}
          </button>
          {ed.imgUrl && <button onClick={ed.removeImg} className="block mt-0.5 text-[10px] text-stone-400 hover:text-red-600">remove</button>}
        </div>
        <input value={ed.value} onChange={e => ed.setValue(e.target.value)}
          className="w-full text-sm px-2 py-1.5 rounded-lg border border-transparent hover:border-stone-200 focus:border-gold focus:outline-none" />
        <input value={ed.family} onChange={e => ed.setFamily(e.target.value)} placeholder="—"
          className="w-full text-sm text-stone-500 px-2 py-1.5 rounded-lg border border-transparent hover:border-stone-200 focus:border-gold focus:outline-none" />
        <ActiveToggle active={row.active} onClick={ed.toggleActive} />
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => setShowI18n(s => !s)} title="Translations" className={`text-sm ${showI18n ? 'text-gold' : 'text-stone-400 hover:text-stone-700'}`}>🌐</button>
          {ed.dirty && <button onClick={ed.save} className="text-xs font-semibold text-white bg-gold hover:bg-gold-dark rounded-lg px-2.5 py-1">Save</button>}
          <button onClick={ed.del} title="Delete" className="text-stone-300 hover:text-red-600 text-sm">🗑</button>
        </div>
      </div>
      {showI18n && <div className="px-4 pb-3 pl-[4.75rem]"><I18nFields ed={ed} /></div>}
    </div>
  )
}

// ── Photo card ───────────────────────────────────────────────────────────────
function OptionCard({ row, index, total, ...h }: { row: AdditionOption; index: number; total: number } & RowHandlers) {
  const ed = useOptionEditor(row, h)
  const [showI18n, setShowI18n] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className={`group relative bg-white rounded-[14px] border border-stone-100 overflow-hidden flex flex-col
      ${row.active ? '' : 'opacity-60'} ${ed.pending ? 'pointer-events-none opacity-70' : ''}`}
      style={{ boxShadow: 'var(--shadow-card)' }}>

      {/* Reorder — top-left, appears on hover */}
      <div className="absolute top-2 left-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => h.onMove(index, -1)} disabled={index === 0}
          className="w-7 h-7 rounded-full bg-white/90 border border-stone-200 text-stone-500 hover:text-gold disabled:opacity-30 flex items-center justify-center text-xs shadow-sm">◀</button>
        <button onClick={() => h.onMove(index, 1)} disabled={index === total - 1}
          className="w-7 h-7 rounded-full bg-white/90 border border-stone-200 text-stone-500 hover:text-gold disabled:opacity-30 flex items-center justify-center text-xs shadow-sm">▶</button>
      </div>

      {/* Delete — top-right, appears on hover */}
      <button onClick={ed.del} title="Delete"
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 border border-stone-200 text-stone-400 hover:text-red-600 flex items-center justify-center text-xs shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">🗑</button>

      {/* Big image — click to upload/replace */}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={ed.onFile} />
      <button onClick={() => fileRef.current?.click()} title={ed.imgUrl ? 'Replace image' : 'Upload image'}
        onDragOver={e => { e.preventDefault(); if (!dragOver) setDragOver(true) }}
        onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
        onDrop={e => {
          e.preventDefault(); setDragOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) ed.uploadFile(f)
        }}
        className={`relative aspect-square bg-stone-50 flex items-center justify-center overflow-hidden transition-all
          ${dragOver ? 'ring-2 ring-gold ring-inset bg-gold/5' : ''}`}>
        {ed.imgUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={ed.imgUrl} alt={row.value} className="w-full h-full object-contain p-3 pointer-events-none" />
          : <span className="text-stone-300 text-3xl pointer-events-none">＋</span>}
        <span className={`absolute inset-0 flex items-center justify-center transition-colors pointer-events-none
          ${dragOver ? 'bg-gold/10' : 'bg-black/0 group-hover:bg-black/5'}`}>
          <span className={`text-[11px] font-medium rounded-full px-2.5 py-1 transition-opacity
            ${dragOver ? 'text-white bg-gold opacity-100' : 'text-white bg-black/45 opacity-0 group-hover:opacity-100'}`}>
            {dragOver ? 'Drop image' : ed.imgUrl ? 'Replace' : 'Upload'}
          </span>
        </span>
      </button>
      {ed.imgUrl && (
        <button onClick={ed.removeImg} className="text-[10px] text-stone-400 hover:text-red-600 py-1">remove image</button>
      )}

      {/* Body */}
      <div className="p-3 pt-2 flex flex-col gap-2 flex-1">
        <input value={ed.value} onChange={e => ed.setValue(e.target.value)}
          className="w-full text-sm font-medium text-stone-800 px-2 py-1 rounded-lg border border-transparent hover:border-stone-200 focus:border-gold focus:outline-none" />
        <input value={ed.family} onChange={e => ed.setFamily(e.target.value)} placeholder="Family"
          className="w-full text-[12px] text-stone-500 px-2 py-1 rounded-lg border border-transparent hover:border-stone-200 focus:border-gold focus:outline-none" />

        {showI18n && <I18nFields ed={ed} />}

        <div className="mt-auto flex items-center justify-between pt-1">
          <ActiveToggle active={row.active} onClick={ed.toggleActive} />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowI18n(s => !s)} title="Translations" className={`text-sm ${showI18n ? 'text-gold' : 'text-stone-400 hover:text-stone-700'}`}>🌐</button>
            {ed.dirty && <button onClick={ed.save} className="text-xs font-semibold text-white bg-gold hover:bg-gold-dark rounded-lg px-2.5 py-1">Save</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add-new (table row or card tile) ─────────────────────────────────────────
function AddRow({
  fieldKey, onAdded, onError, variant,
}: {
  fieldKey: string
  onAdded: (row: AdditionOption) => void
  onError: (msg: string | null) => void
  variant: 'table' | 'card'
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

  if (variant === 'card') {
    return (
      <div className="rounded-[14px] border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 p-4 text-center min-h-[220px]">
        <span className="text-stone-300 text-2xl">＋</span>
        <input value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="New option value…"
          className="w-full text-sm px-2 py-1.5 rounded-lg border border-stone-200 focus:border-gold focus:outline-none" />
        <input value={family} onChange={e => setFamily(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Family (optional)"
          className="w-full text-[12px] px-2 py-1.5 rounded-lg border border-stone-200 focus:border-gold focus:outline-none" />
        <button onClick={add} disabled={pending || !value.trim()}
          className="text-xs font-semibold text-white bg-gold hover:bg-gold-dark disabled:opacity-40 rounded-lg px-4 py-1.5">Add</button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[auto_56px_1fr_1fr_auto_auto] gap-3 items-center px-4 py-3 bg-stone-50/60 rounded-b-[14px]">
      <span className="text-stone-300 text-lg pl-1">＋</span>
      <span />
      <input value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }}
        placeholder="New option value…"
        className="w-full text-sm px-2 py-1.5 rounded-lg border border-stone-200 focus:border-gold focus:outline-none" />
      <input value={family} onChange={e => setFamily(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }}
        placeholder="Family (optional)"
        className="w-full text-sm px-2 py-1.5 rounded-lg border border-stone-200 focus:border-gold focus:outline-none" />
      <span />
      <button onClick={add} disabled={pending || !value.trim()}
        className="text-xs font-semibold text-white bg-gold hover:bg-gold-dark disabled:opacity-40 rounded-lg px-3 py-1.5 justify-self-end">Add</button>
    </div>
  )
}
