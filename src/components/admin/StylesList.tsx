'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { setStyleNumColours, uploadStyleMaquette } from '@/app/actions/admin-styles'

export type StyleRow = {
  styleName:    string
  numColours:   number | null
  maquetteUrl:  string | null
  section:      string | null
  variantCount: number
}

export default function StylesList({ rows: initial }: { rows: StyleRow[] }) {
  const [rows, setRows] = useState(initial)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'missing' | 'no-maquette' | 'has-maquette'>('all')
  const [preview, setPreview] = useState<string | null>(null)

  const shown = useMemo(() => rows.filter(r => {
    if (q && !r.styleName.toLowerCase().includes(q.toLowerCase())) return false
    if (filter === 'missing' && r.numColours != null) return false
    if (filter === 'no-maquette' && r.maquetteUrl) return false
    if (filter === 'has-maquette' && !r.maquetteUrl) return false
    return true
  }), [rows, q, filter])

  const patch = (style: string, p: Partial<StyleRow>) =>
    setRows(rs => rs.map(r => r.styleName === style ? { ...r, ...p } : r))

  const filledColours = rows.filter(r => r.numColours != null).length
  const withMaquette = rows.filter(r => r.maquetteUrl).length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search style…"
          className="rounded-lg border border-stone-300 px-3 py-1.5" />
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
          className="rounded-lg border border-stone-300 px-3 py-1.5">
          <option value="all">All ({rows.length})</option>
          <option value="has-maquette">With maquette ({withMaquette})</option>
          <option value="no-maquette">No maquette ({rows.length - withMaquette})</option>
          <option value="missing">Missing nr. colours ({rows.length - filledColours})</option>
        </select>
        <span className="text-stone-400">nr. colours: {filledColours}/{rows.length} · maquettes: {withMaquette}/{rows.length}</span>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-stone-200" style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-400">
            <tr>
              <th className="px-4 py-2">Style</th>
              <th className="px-4 py-2">Section</th>
              <th className="px-4 py-2">Variants</th>
              <th className="px-4 py-2">Nr. colours *</th>
              <th className="px-4 py-2">Maquette</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(r => <Row key={r.styleName} r={r} patch={patch} setPreview={setPreview} />)}
          </tbody>
        </table>
      </div>

      {/* Floating enlarged maquette — shown on thumbnail hover OR while editing nr. colours,
          so you can read the circled piece-numbers while typing the count. */}
      {preview && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 rounded-xl border border-stone-200 bg-white p-2 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="maquette preview" className="h-auto w-[460px] max-w-[42vw] object-contain" />
        </div>
      )}
    </div>
  )
}

function Row({ r, patch, setPreview }: {
  r: StyleRow
  patch: (s: string, p: Partial<StyleRow>) => void
  setPreview: (url: string | null) => void
}) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const saveColours = (val: string) => {
    const n = val === '' ? null : Number(val)
    patch(r.styleName, { numColours: n })
    start(async () => {
      const res = await setStyleNumColours(r.styleName, n)
      setErr(res.error ?? null)
    })
  }

  const upload = (file: File) => {
    const fd = new FormData(); fd.set('style_name', r.styleName); fd.set('file', file)
    start(async () => {
      const res = await uploadStyleMaquette(fd)
      if (res.error) setErr(res.error)
      else { setErr(null); location.reload() }  // reload to pick up the new public maquette URL
    })
  }

  return (
    <tr className={`border-t border-stone-100 ${pending ? 'opacity-60' : ''}`}>
      <td className="px-4 py-2 font-medium text-stone-800">{r.styleName}</td>
      <td className="px-4 py-2 text-stone-500">{r.section ?? '—'}</td>
      <td className="px-4 py-2 text-stone-400">{r.variantCount}</td>
      <td className="px-4 py-2">
        <input type="number" min={1} max={30} defaultValue={r.numColours ?? ''}
          onFocus={() => setPreview(r.maquetteUrl)}
          onBlur={e => { setPreview(null); saveColours(e.target.value) }}
          className={`w-20 rounded-lg border px-2 py-1 ${r.numColours == null ? 'border-amber-300 bg-amber-50' : 'border-stone-300'}`} />
        {err && <span className="ml-2 text-xs text-red-600">{err}</span>}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-3">
          {r.maquetteUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={r.maquetteUrl} alt={`${r.styleName} maquette`}
                onMouseEnter={() => setPreview(r.maquetteUrl)} onMouseLeave={() => setPreview(null)}
                className="h-12 w-24 cursor-zoom-in rounded border border-stone-200 object-contain" />
            : <span className="text-xs text-stone-300">none</span>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/svg+xml,.jpg,.jpeg,.svg" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
          <button onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-stone-200 px-3 py-1 text-xs text-stone-600 hover:bg-stone-50">
            {r.maquetteUrl ? 'Replace' : 'Upload'}
          </button>
        </div>
      </td>
    </tr>
  )
}
