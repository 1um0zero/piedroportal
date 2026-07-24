'use client'

// AI Assist (BETA) — free-text → pre-filled CUSTOM additions.
// The clinician describes the customizations in any language; the server parses
// them against the CUSTOM schema (never inventing values) and this component
// merges the validated patch into the form state. Everything stays reviewable
// field-by-field — the AI only pre-fills, the human confirms.

import { useState } from 'react'

type Applied = { key: string; label: string; side: string; value: string }
type AiResult = { applied: Applied[]; patch: Record<string, unknown>; unmatched: string[]; warnings: string[] }

export default function CustomAiPrompt({
  unit, values, onChange,
}: {
  unit: 'LEFT_RIGHT' | 'LEFT' | 'RIGHT'
  values: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AiResult | null>(null)
  const [undo, setUndo] = useState<Record<string, unknown> | null>(null)

  async function run() {
    if (!prompt.trim() || busy) return
    setBusy(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/custom/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), unit, current: values }),
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
    <div className="rounded-[14px] border border-dashed border-gold/50 bg-gold/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-gold">✦ AI Assist</span>
        <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Beta</span>
        <span className="text-xs text-stone-400">describe the customizations — the form fills itself, you review</span>
      </div>
      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run() }}
          rows={2}
          maxLength={2000}
          placeholder={'e.g. "heel height 70mm, velcro closure with D-ring, advancing rocker, lateral over ankle orthosis left 50mm ercoflex" — any language'}
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          disabled={busy}
        />
        <button
          type="button"
          onClick={run}
          disabled={busy || !prompt.trim()}
          className="self-end rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? 'Reading…' : 'Fill form'}
        </button>
      </div>

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
            <div className="text-stone-500">Nothing recognisable in the description — try being more specific.</div>
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
