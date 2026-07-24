'use client'

// AI Assist (BETA) — free text AND/OR photos/PDFs → pre-filled CUSTOM additions.
// The clinician describes the customizations in any language, or uploads a photo /
// scan / PDF of a hand-annotated form (handwritten notes, arrows at pictograms,
// circled options). The server parses everything against the CUSTOM schema (never
// inventing values) and this component merges the validated patch into the form
// state. Everything stays reviewable field-by-field — the AI only pre-fills.

import { useRef, useState } from 'react'

type Applied = { key: string; label: string; side: string; value: string }
type AiResult = { applied: Applied[]; patch: Record<string, unknown>; unmatched: string[]; warnings: string[] }
type Attachment = { name: string; media_type: string; data: string; preview: string | null }

const MAX_FILES = 4
const MAX_TOTAL_B64 = 5_400_000        // keep in sync with the API route (~4MB binary)
const MAX_IMG_EDGE = 2576              // the model's native max resolution — no point sending more

// Downscale an image in-browser: phone photos are 5–10MB, far over the request
// cap, and anything above 2576px is wasted. Falls back to the original bytes
// when the browser can't decode the format (then only the size cap applies).
async function fileToAttachment(file: File): Promise<Attachment | string> {
  const asB64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve((r.result as string).split(',')[1])
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

  if (file.type === 'application/pdf') {
    const data = await asB64(file)
    if (data.length > MAX_TOTAL_B64) return `"${file.name}" is too large — max ~4MB.`
    return { name: file.name, media_type: 'application/pdf', data, preview: null }
  }
  if (!file.type.startsWith('image/')) return `"${file.name}": only photos (JPG/PNG/WebP) and PDFs are supported.`

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMG_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.85))
    if (!blob) throw new Error('encode failed')
    const data = await asB64(blob)
    return { name: file.name, media_type: 'image/jpeg', data, preview: canvas.toDataURL('image/jpeg', 0.4) }
  } catch {
    // Undecodable in this browser (e.g. HEIC) — send as-is if within the cap.
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))
      return `"${file.name}": this image format isn't supported — please use JPG or PNG.`
    const data = await asB64(file)
    if (data.length > MAX_TOTAL_B64) return `"${file.name}" is too large — max ~4MB.`
    return { name: file.name, media_type: file.type, data, preview: null }
  }
}

export default function CustomAiPrompt({
  unit, values, onChange,
}: {
  unit: 'LEFT_RIGHT' | 'LEFT' | 'RIGHT'
  values: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AiResult | null>(null)
  const [undo, setUndo] = useState<Record<string, unknown> | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function addFiles(list: FileList | File[]) {
    setError(null)
    const incoming = [...list].slice(0, MAX_FILES - files.length)
    if (!incoming.length) { setError(`Max ${MAX_FILES} files.`); return }
    const next = [...files]
    for (const f of incoming) {
      const att = await fileToAttachment(f)
      if (typeof att === 'string') { setError(att); continue }
      next.push(att)
    }
    const total = next.reduce((s, a) => s + a.data.length, 0)
    if (total > MAX_TOTAL_B64) { setError('Attachments too large together — max ~4MB in total.'); return }
    setFiles(next)
  }

  async function run() {
    if ((!prompt.trim() && !files.length) || busy) return
    setBusy(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/custom/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(), unit, current: values,
          attachments: files.map(f => ({ media_type: f.media_type, data: f.data })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      const r = data as AiResult
      setResult(r)
      if (Object.keys(r.patch).length) {
        setUndo(values)
        // merge: sided patches ({l,r}) merge per side over the existing value
        const merged = { ...values }
        for (const [k, v] of Object.entries(r.patch)) {
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            merged[k] = { ...((merged[k] as object) ?? {}), ...v }
          } else {
            merged[k] = v
          }
        }
        onChange(merged)
      }
    } catch {
      setError('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  function revert() {
    if (undo) { onChange(undo); setUndo(null); setResult(null) }
  }

  return (
    <div
      className={`rounded-[14px] border border-dashed p-4 transition-colors ${dragOver ? 'border-gold bg-gold/10' : 'border-gold/50 bg-gold/[0.04]'}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-gold">✦ AI Assist</span>
        <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Beta</span>
        <span className="text-xs text-stone-400">describe it, or drop a photo / scanned form / PDF — the form fills itself, you review</span>
      </div>

      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run() }}
          onPaste={e => {
            const pasted = [...e.clipboardData.files]
            if (pasted.length) { e.preventDefault(); addFiles(pasted) }
          }}
          rows={2}
          maxLength={2000}
          placeholder={'e.g. "heel height 70mm, velcro closure with D-ring, advancing rocker" — any language. Or paste / drop a photo of the handwritten form.'}
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          disabled={busy}
        />
        <div className="flex flex-col justify-end gap-1.5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy || files.length >= MAX_FILES}
            className="rounded-lg border border-gold/40 px-4 py-2 text-sm text-gold hover:bg-gold/5 disabled:opacity-40"
            title="Attach a photo or PDF (or drag & drop / paste)"
          >
            📎 Photo / PDF
          </button>
          <button
            type="button"
            onClick={run}
            disabled={busy || (!prompt.trim() && !files.length)}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? 'Reading…' : 'Fill form'}
          </button>
        </div>
      </div>
      <input
        ref={fileInput} type="file" multiple hidden
        accept="image/*,application/pdf"
        onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }}
      />

      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative flex items-center gap-2 rounded-lg border border-stone-200 bg-white py-1 pl-1 pr-2 text-xs text-stone-600">
              {f.preview
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={f.preview} alt={f.name} className="h-9 w-9 rounded object-cover" />
                : <span className="flex h-9 w-9 items-center justify-center rounded bg-red-50 text-[10px] font-bold text-red-500">PDF</span>}
              <span className="max-w-[140px] truncate">{f.name}</span>
              <button
                type="button" aria-label={`Remove ${f.name}`}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="ml-1 text-stone-400 hover:text-red-500"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {busy && files.length > 0 && (
        <div className="mt-2 text-xs text-stone-400">Reading the document — handwriting, arrows and ticks included. This can take up to a minute…</div>
      )}

      {error && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {result && (
        <div className="mt-3 space-y-2 text-xs">
          {result.applied.length > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-stone-600">Filled {result.applied.length} field{result.applied.length === 1 ? '' : 's'} — please review below:</span>
                {undo && <button type="button" onClick={revert} className="text-stone-400 underline hover:text-stone-600">undo</button>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.applied.map((a, i) => (
                  <span key={`${a.key}-${i}`} className="rounded-full border border-gold/40 bg-white px-2.5 py-1 text-stone-700">
                    {a.label}{a.side !== '—' ? ` (${a.side})` : ''}: <span className="font-medium text-gold">{a.value}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {result.applied.length === 0 && !result.unmatched.length && !result.warnings.length && (
            <div className="text-stone-500">Nothing recognisable — try a clearer photo or a more specific description.</div>
          )}
          {result.unmatched.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
              <span className="font-semibold">Not understood — set these manually:</span>
              <ul className="mt-0.5 list-inside list-disc">
                {result.unmatched.map((u, i) => <li key={i}>&ldquo;{u}&rdquo;</li>)}
              </ul>
            </div>
          )}
          {result.warnings.length > 0 && (
            <ul className="list-inside list-disc text-stone-500">
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
