'use client'

import { useMemo, useRef, useState } from 'react'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`

// ── Filename parsing ─────────────────────────────────────────────────────────

const IMG_EXT = /\.(png|jpe?g|webp|tif?f|gif|bmp)$/i

/** Parse "<colour_id>.<index>.<ext>" → { colourId, index }. Index defaults to 1. */
function parseName(fileName: string, fallbackFolder?: string): { colourId: string; index: number } | null {
  if (!IMG_EXT.test(fileName)) return null
  const stem = fileName.replace(IMG_EXT, '')
  // trailing ".<1-2 digits>" → index
  const m = stem.match(/^(.+)\.(\d{1,2})$/)
  if (m) return { colourId: m[1].trim(), index: parseInt(m[2], 10) }
  // no index in filename: use folder name if it looks like a colour_id, else the stem
  const base = (fallbackFolder && /^[\w-]+\.\d+/.test(fallbackFolder)) ? fallbackFolder : stem
  return { colourId: base.trim(), index: 1 }
}

function folderOf(relPath?: string): string | undefined {
  if (!relPath) return undefined
  const parts = relPath.split('/')
  return parts.length > 1 ? parts[parts.length - 2] : undefined
}

type Item = {
  file: File
  colourId: string
  index: number
  storageName: string
  matched: boolean
  status: 'queued' | 'uploading' | 'done' | 'error'
  error?: string
}

async function uploadOne(file: File, colourId: string, index: number): Promise<{ ok: boolean; error?: string }> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('colourId', colourId)
  fd.append('index', String(index))
  const res = await fetch('/api/admin/products/upload-image', { method: 'POST', body: fd })
  const json = await res.json().catch(() => ({}))
  return res.ok ? { ok: true } : { ok: false, error: json.error ?? `HTTP ${res.status}` }
}

// ── Bulk / folder mode ───────────────────────────────────────────────────────

export function BulkImageUpload({ colourIds }: { colourIds: string[] }) {
  const colourSet = useMemo(() => new Set(colourIds), [colourIds])
  const [items, setItems] = useState<Item[]>([])
  const [running, setRunning] = useState(false)
  const folderRef = useRef<HTMLInputElement>(null)

  function ingest(fileList: FileList | null) {
    if (!fileList) return
    const next: Item[] = []
    for (const file of Array.from(fileList)) {
      // webkitRelativePath exists for directory picks
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
      const parsed = parseName(file.name, folderOf(rel))
      if (!parsed) continue
      next.push({
        file,
        colourId: parsed.colourId,
        index: parsed.index,
        storageName: `${parsed.colourId}.${String(parsed.index).padStart(2, '0')}.png`,
        matched: colourSet.has(parsed.colourId),
        status: 'queued',
      })
    }
    next.sort((a, b) => a.colourId.localeCompare(b.colourId) || a.index - b.index)
    setItems(next)
  }

  async function run() {
    setRunning(true)
    const queue = [...items]
    for (let i = 0; i < queue.length; i++) {
      if (!queue[i].matched) continue
      setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'uploading' } : it))
      const r = await uploadOne(queue[i].file, queue[i].colourId, queue[i].index)
      setItems(prev => prev.map((it, idx) => idx === i
        ? { ...it, status: r.ok ? 'done' : 'error', error: r.error } : it))
    }
    setRunning(false)
  }

  const matched = items.filter(i => i.matched).length
  const unmatched = items.length - matched
  const done = items.filter(i => i.status === 'done').length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-sm text-stone-600 mb-4">
          Pick a folder (the whole tree is scanned) or individual files. Names are normalised to{' '}
          <code className="text-gold">colour_id.NN.png</code> — indices without a leading zero
          (<code>.1</code>) become <code>.01</code>, and any format is converted to PNG.
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Folder picker — webkitdirectory walks the tree in the browser */}
          <input
            ref={folderRef}
            type="file"
            // @ts-expect-error non-standard attributes for directory upload
            webkitdirectory="" directory="" mozdirectory=""
            multiple
            className="hidden"
            onChange={e => ingest(e.target.files)}
          />
          <button onClick={() => folderRef.current?.click()}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
            Pick folder…
          </button>
          <label className="cursor-pointer rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
            Pick files…
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => ingest(e.target.files)} />
          </label>
          <button onClick={run} disabled={running || matched === 0}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">
            {running ? `Uploading… (${done}/${matched})` : `Upload ${matched} matched`}
          </button>
        </div>
        {items.length > 0 && (
          <p className="mt-3 text-xs text-stone-400">
            {items.length} images · {matched} matched · {unmatched > 0 && <span className="text-red-500">{unmatched} unmatched (will be skipped)</span>}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-stone-50">
                <tr>
                  {['file', '→ target', 'product', 'status'].map(c =>
                    <th key={c} className="px-4 py-2 text-left text-[11px] font-semibold text-stone-400 uppercase">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {items.map((it, i) => (
                  <tr key={i} className={it.matched ? '' : 'bg-red-50/40'}>
                    <td className="px-4 py-1.5 text-stone-500 truncate max-w-[220px]">{it.file.name}</td>
                    <td className="px-4 py-1.5 text-stone-700 font-mono text-xs">{it.storageName}</td>
                    <td className="px-4 py-1.5">{it.matched
                      ? <span className="text-emerald-600">✓ {it.colourId}</span>
                      : <span className="text-red-500">✗ no match</span>}</td>
                    <td className="px-4 py-1.5">
                      {it.status === 'queued' && <span className="text-stone-400">queued</span>}
                      {it.status === 'uploading' && <span className="text-blue-500">uploading…</span>}
                      {it.status === 'done' && <span className="text-emerald-600">done</span>}
                      {it.status === 'error' && <span className="text-red-500" title={it.error}>error</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Per-product slots ────────────────────────────────────────────────────────

export function ProductImageSlots({ colourId }: { colourId: string }) {
  const slots = [1, 2, 3, 4, 5, 6, 7, 8]
  const [status, setStatus] = useState<Record<number, 'idle' | 'uploading' | 'done' | 'error'>>({})
  const [bust, setBust] = useState(0) // cache-buster after upload
  const [err, setErr] = useState<string | null>(null)

  async function pick(index: number, files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setErr(null)
    setStatus(s => ({ ...s, [index]: 'uploading' }))
    const r = await uploadOne(file, colourId, index)
    setStatus(s => ({ ...s, [index]: r.ok ? 'done' : 'error' }))
    if (r.ok) setBust(b => b + 1)
    else setErr(r.error ?? 'Upload failed')
  }

  return (
    <div>
      {err && <p className="mb-2 text-xs text-red-500">{err}</p>}
      <div className="grid grid-cols-4 gap-3">
        {slots.map(n => {
          const name = `${colourId}.${String(n).padStart(2, '0')}.png`
          const st = status[n] ?? 'idle'
          return (
            <label key={n} className="group relative aspect-square cursor-pointer rounded-xl border border-stone-200 bg-stone-50 overflow-hidden hover:border-gold">
              <input type="file" accept="image/*" className="hidden" onChange={e => pick(n, e.target.files)} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BUCKET}/${name}?v=${bust}`}
                alt={`${n}`}
                className="h-full w-full object-contain p-1"
                onLoad={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'visible' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
              />
              <span className="absolute top-1 left-1 rounded bg-black/50 px-1.5 text-[10px] font-bold text-white">
                {n === 1 ? 'main' : String(n).padStart(2, '0')}
              </span>
              {st === 'uploading' && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-blue-500">uploading…</span>}
              {st === 'done' && <span className="absolute bottom-1 right-1 text-emerald-600 text-xs">✓</span>}
              {st === 'error' && <span className="absolute bottom-1 right-1 text-red-500 text-xs">!</span>}
            </label>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-stone-400">Slot 1 is the main image (sets picture_name). Any format is converted to PNG and resized.</p>
    </div>
  )
}
