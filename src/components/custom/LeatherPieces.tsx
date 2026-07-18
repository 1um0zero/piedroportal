'use client'

import { useState } from 'react'
import type { LeatherPiece } from './custom-additions-config'
import { maquetteUrl, leatherGroups } from '@/lib/custom/maquette'

/**
 * Leather-by-piece assignment for a custom upper. Shows the model's maquette
 * line-drawing (pieces numbered ① ② ③… by Piedro) beside a list where each
 * numbered piece gets a colour + material. The staff reads the number off the
 * drawing and assigns its leather; the same number in several places = one
 * leather. Value = LeatherPiece[] (index 0 → piece ①).
 */
export function LeatherPieces({
  styleName, label, hint, value, onChange,
}: {
  styleName?: string
  label: string
  hint?: string | null
  value: LeatherPiece[]
  onChange: (v: LeatherPiece[]) => void
}) {
  const url = maquetteUrl(styleName)
  const groups = leatherGroups(styleName)   // how many numbered pieces the model has (null = unknown)
  const [zoom, setZoom] = useState(false)

  const pieces = value ?? []
  const atCap = groups != null && pieces.length >= groups   // can't assign more leathers than pieces
  const setPiece = (i: number, patch: Partial<LeatherPiece>) =>
    onChange(pieces.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const add = () => { if (!atCap) onChange([...pieces, { colour: '', material: '' }]) }
  const remove = (i: number) => onChange(pieces.filter((_, j) => j !== i))

  return (
    <div>
      <label className="mb-1 flex items-center gap-2 text-xs text-stone-500">
        {label}
        {groups != null && (
          <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold">
            {pieces.length}/{groups} {groups === 1 ? 'piece' : 'pieces'}
          </span>
        )}
      </label>
      {hint && <p className="mb-2 text-[11px] text-stone-400">{hint}</p>}

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {/* Maquette drawing */}
        {url ? (
          <button type="button" onClick={() => setZoom(true)}
            className="group relative shrink-0 self-center overflow-hidden rounded-xl border border-stone-200 bg-white p-2 md:w-[280px]"
            title="Click to enlarge">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Maquette ${styleName ?? ''}`} className="h-auto w-full object-contain" />
            <span className="absolute right-2 top-2 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] text-stone-500 opacity-0 transition-opacity group-hover:opacity-100">⤢ zoom</span>
          </button>
        ) : (
          <div className="flex shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 p-4 text-center text-[11px] text-stone-400 md:w-[280px]">
            No drawing available for this model — assign the pieces below.
          </div>
        )}

        {/* Per-piece leather rows */}
        <div className="min-w-0 flex-1 space-y-2">
          {pieces.length === 0 && (
            <p className="text-[11px] text-stone-400">
              Read the numbered pieces on the drawing, then add one leather per number.
            </p>
          )}
          {pieces.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gold text-[11px] font-semibold text-gold">
                {i + 1}
              </span>
              <input
                type="text" value={p.colour ?? ''} placeholder="Colour"
                onChange={e => setPiece(i, { colour: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              <input
                type="text" value={p.material ?? ''} placeholder="Material / leather"
                onChange={e => setPiece(i, { material: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
              <button type="button" onClick={() => remove(i)} aria-label={`Remove piece ${i + 1}`}
                className="shrink-0 rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {atCap ? (
            <p className="mt-1 text-[11px] text-stone-400">
              All {groups} {groups === 1 ? 'piece' : 'pieces'} of this model assigned.
            </p>
          ) : (
            <button type="button" onClick={add}
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-gold/60 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold hover:text-white">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              Add piece {pieces.length + 1}
            </button>
          )}
        </div>
      </div>

      {/* Zoom overlay */}
      {zoom && url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={() => setZoom(false)}>
          <div className="max-h-full max-w-3xl overflow-auto rounded-xl bg-white p-4" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Maquette ${styleName ?? ''}`} className="h-auto w-full object-contain" />
            <button type="button" onClick={() => setZoom(false)}
              className="mt-3 w-full rounded-lg bg-stone-100 py-2 text-sm text-stone-600 hover:bg-stone-200">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
