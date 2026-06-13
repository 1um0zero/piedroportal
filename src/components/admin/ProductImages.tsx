'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

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
  folder?: string
  colourId: string
  index: number
  storageName: string
  matched: boolean
  /** Folder is named like a colour_id but the filename points to a different one — excluded from upload. */
  mismatch: boolean
  /** colour_id follows a canonical Piedro format (normal / fashion / ZSM). */
  convention: boolean
  status: 'queued' | 'uploading' | 'done' | 'error'
  error?: string
}

/** Does a folder name look like a colour_id (e.g. "4904.4336")? */
const FOLDER_AS_ID = /^[\w-]+\.\d+$/

/**
 * A colour_id that follows one of the three canonical Piedro formats
 * (see reference_style_nomenclature). Used to decide whether an image with no
 * product yet may still be uploaded as an "orphan" — it will link automatically
 * once a product with that colour_id is created/imported.
 */
const COLOUR_ID_CONVENTION = [
  /^[0-9]+[A-Z]?\.[0-9]+$/,                 // normal   e.g. 1700.0393 / 2034K.0336
  /^7[0-9]{2}\.[0-9]+\.[0-9]{2}\.[0-9]+$/,  // fashion  e.g. 711.03620.54.1620
  /^B[0-9]+\.[0-9]+$/,                      // ZSM      e.g. B5713.2500
]
const followsConvention = (id: string) => COLOUR_ID_CONVENTION.some(re => re.test(id))

// Vercel rejects request bodies over ~4.5 MB before they reach the handler, so
// large photos are downscaled in the browser first (the server only needs ≤1200/
// 700 px anyway). PNG output preserves transparency; EXIF orientation is baked in.
const MAX_UPLOAD_DIM = 1600
const SIZE_THRESHOLD = 3_500_000 // bytes; below this, send the file untouched

async function prepareForUpload(file: File): Promise<File> {
  if (file.size <= SIZE_THRESHOLD) return file
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_UPLOAD_DIM / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
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

async function uploadOne(
  file: File,
  colourId: string,
  index: number,
  normalize = false,
): Promise<{ ok: boolean; error?: string }> {
  const prepared = await prepareForUpload(file)
  const fd = new FormData()
  fd.append('file', prepared)
  fd.append('colourId', colourId)
  fd.append('index', String(index))
  if (normalize) fd.append('normalize', 'true')
  const res = await fetch('/api/admin/products/upload-image', { method: 'POST', body: fd })
  const json = await res.json().catch(() => ({}))
  return res.ok ? { ok: true } : { ok: false, error: json.error ?? `HTTP ${res.status}` }
}

// ── Bulk / folder mode ───────────────────────────────────────────────────────

export function BulkImageUpload({ colourIds }: { colourIds: string[] }) {
  const t = useTranslations('admin.products')
  const colourSet = useMemo(() => new Set(colourIds), [colourIds])
  const [items, setItems] = useState<Item[]>([])
  const [running, setRunning] = useState(false)
  const [acceptOrphans, setAcceptOrphans] = useState(false)
  const [normalize, setNormalize] = useState(false)
  const folderRef = useRef<HTMLInputElement>(null)

  function ingest(fileList: FileList | null) {
    if (!fileList) return
    const next: Item[] = []
    for (const file of Array.from(fileList)) {
      // webkitRelativePath exists for directory picks
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
      const folder = folderOf(rel)
      const parsed = parseName(file.name, folder)
      if (!parsed) continue
      // Folder named like a colour_id must agree with the filename; mixed folders skip this check.
      const mismatch = !!folder && FOLDER_AS_ID.test(folder) && folder !== parsed.colourId
      next.push({
        file,
        folder,
        colourId: parsed.colourId,
        index: parsed.index,
        storageName: `${parsed.colourId}.${String(parsed.index).padStart(2, '0')}.png`,
        matched: !mismatch && colourSet.has(parsed.colourId),
        mismatch,
        convention: followsConvention(parsed.colourId),
        status: 'queued',
      })
    }
    next.sort((a, b) => a.colourId.localeCompare(b.colourId) || a.index - b.index)
    setItems(next)
    setAcceptOrphans(false)
  }

  /** An image with no product yet, but a valid colour_id — may be uploaded on confirmation. */
  const isOrphan = (it: Item) => !it.matched && !it.mismatch && it.convention
  /** Will this item actually be uploaded given the current confirmation state? */
  const willUpload = (it: Item) => it.matched || (acceptOrphans && isOrphan(it))

  async function run() {
    setRunning(true)
    const queue = [...items]
    for (let i = 0; i < queue.length; i++) {
      if (!willUpload(queue[i])) continue
      setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'uploading' } : it))
      const r = await uploadOne(queue[i].file, queue[i].colourId, queue[i].index, normalize)
      setItems(prev => prev.map((it, idx) => idx === i
        ? { ...it, status: r.ok ? 'done' : 'error', error: r.error } : it))
    }
    setRunning(false)
  }

  const matched = items.filter(i => i.matched).length
  const orphans = items.filter(isOrphan).length
  const unmatched = items.length - matched
  const uploadable = matched + (acceptOrphans ? orphans : 0)
  const done = items.filter(i => i.status === 'done').length

  // Anomalies detected during ingest — informative, nothing is blocked.
  const anomalies = useMemo(() => {
    const out: string[] = []
    // 1. File lives in a folder named like a colour_id, but the filename points elsewhere → excluded.
    const mismatchByFolder = new Map<string, Set<string>>()
    for (const it of items) {
      if (it.mismatch && it.folder) {
        if (!mismatchByFolder.has(it.folder)) mismatchByFolder.set(it.folder, new Set())
        mismatchByFolder.get(it.folder)!.add(it.colourId)
      }
    }
    for (const [folder, ids] of mismatchByFolder) {
      out.push(t('anom_folder_mismatch', { folder, ids: [...ids].join(', ') }))
    }
    // 2. Two or more files map to the same storage target — only the last upload survives.
    const byTarget = new Map<string, number>()
    for (const it of items) {
      if (it.matched) byTarget.set(it.storageName, (byTarget.get(it.storageName) ?? 0) + 1)
    }
    for (const [target, count] of byTarget) {
      if (count > 1) out.push(t('anom_duplicate_target', { target, count }))
    }
    // 3. Unmatched colour_ids that ALSO break the naming convention — these can never
    //    auto-link, so they are genuine anomalies. Convention-valid orphans are handled
    //    by the dedicated confirmation panel instead.
    const noMatch = new Map<string, number>()
    for (const it of items) {
      if (!it.matched && !it.mismatch && !it.convention)
        noMatch.set(it.colourId, (noMatch.get(it.colourId) ?? 0) + 1)
    }
    for (const [id, count] of noMatch) out.push(t('anom_unmatched', { id, count }))
    return out
  }, [items, t])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-sm text-stone-600 mb-4">{t('images_intro')}</p>
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
            {t('pick_folder')}
          </button>
          <label className="cursor-pointer rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">
            {t('pick_files')}
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => ingest(e.target.files)} />
          </label>
          <button onClick={run} disabled={running || uploadable === 0}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">
            {running ? t('uploading_progress', { done, total: uploadable }) : t('upload_matched', { count: uploadable })}
          </button>
        </div>
        <label className="mt-3 flex items-start gap-2 text-sm text-stone-600 cursor-pointer">
          <input type="checkbox" checked={normalize}
            onChange={e => setNormalize(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-gold" />
          <span>{t('normalize_label')} <span className="text-stone-400">{t('normalize_hint')}</span></span>
        </label>
        {items.length > 0 && (
          <p className="mt-3 text-xs text-stone-400">
            {t('summary_images', { total: items.length, matched })}
            {unmatched > 0 && <> · <span className="text-red-500">{t('unmatched_note', { count: unmatched })}</span></>}
          </p>
        )}
      </div>

      {orphans > 0 && (
        <label className="flex items-start gap-3 rounded-[14px] border border-sky-200 bg-sky-50 p-4 cursor-pointer">
          <input type="checkbox" checked={acceptOrphans}
            onChange={e => setAcceptOrphans(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-gold" />
          <span className="text-sm text-sky-800">{t('accept_orphans', { count: orphans })}</span>
        </label>
      )}

      {anomalies.length > 0 && (
        <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">{t('anomalies_title', { count: anomalies.length })}</p>
          <ul className="space-y-1 text-xs text-amber-700 list-disc pl-4">
            {anomalies.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-stone-50">
                <tr>
                  {[t('col_file'), t('col_target'), t('col_product'), t('col_status')].map(c =>
                    <th key={c} className="px-4 py-2 text-left text-[11px] font-semibold text-stone-400 uppercase">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {items.map((it, i) => (
                  <tr key={i} className={it.matched ? '' : isOrphan(it) ? 'bg-sky-50/50' : it.mismatch ? 'bg-amber-50/60' : 'bg-red-50/40'}>
                    <td className="px-4 py-1.5 text-stone-500 truncate max-w-[220px]">{it.file.name}</td>
                    <td className="px-4 py-1.5 text-stone-700 font-mono text-xs">{it.storageName}</td>
                    <td className="px-4 py-1.5">{it.matched
                      ? <span className="text-emerald-600">✓ {it.colourId}</span>
                      : isOrphan(it)
                        ? <span className={acceptOrphans ? 'text-sky-600' : 'text-sky-400'} title={it.colourId}>{t('orphan_pending')}</span>
                        : it.mismatch
                          ? <span className="text-amber-600" title={t('excluded_mismatch_hint', { folder: it.folder ?? '' })}>{t('excluded_mismatch')}</span>
                          : <span className="text-red-500">{t('no_match')}</span>}</td>
                    <td className="px-4 py-1.5">
                      {it.status === 'queued' && <span className="text-stone-400">{t('st_queued')}</span>}
                      {it.status === 'uploading' && <span className="text-blue-500">{t('st_uploading')}</span>}
                      {it.status === 'done' && <span className="text-emerald-600">{t('st_done')}</span>}
                      {it.status === 'error' && (
                        <span className="text-red-500" title={it.error}>
                          {t('st_error')}
                          {it.error && <span className="ml-1 text-[11px] text-red-400">— {it.error}</span>}
                        </span>
                      )}
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
  const t = useTranslations('admin.products')
  const slots = [1, 2, 3, 4, 5, 6, 7, 8]
  const [status, setStatus] = useState<Record<number, 'idle' | 'uploading' | 'done' | 'error'>>({})
  const [bust, setBust] = useState(0) // cache-buster after upload
  const [err, setErr] = useState<string | null>(null)
  const [normalize, setNormalize] = useState(false)

  async function pick(index: number, files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setErr(null)
    setStatus(s => ({ ...s, [index]: 'uploading' }))
    const r = await uploadOne(file, colourId, index, normalize)
    setStatus(s => ({ ...s, [index]: r.ok ? 'done' : 'error' }))
    if (r.ok) setBust(b => b + 1)
    else setErr(r.error ?? 'Upload failed')
  }

  return (
    <div>
      <label className="mb-3 flex items-start gap-2 text-sm text-stone-600 cursor-pointer">
        <input type="checkbox" checked={normalize}
          onChange={e => setNormalize(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-gold" />
        <span>{t('normalize_label')} <span className="text-stone-400">{t('normalize_hint')}</span></span>
      </label>
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
                {n === 1 ? t('slot_main') : String(n).padStart(2, '0')}
              </span>
              {st === 'uploading' && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-blue-500">uploading…</span>}
              {st === 'done' && <span className="absolute bottom-1 right-1 text-emerald-600 text-xs">✓</span>}
              {st === 'error' && <span className="absolute bottom-1 right-1 text-red-500 text-xs">!</span>}
            </label>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-stone-400">{t('slots_hint')}</p>
    </div>
  )
}
