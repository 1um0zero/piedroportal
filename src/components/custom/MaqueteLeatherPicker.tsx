'use client'

import { useEffect, useState } from 'react'

type Zone = { id: string; name: string; points: string }
type Maquete = { id: string; image: string; viewBox: string; silhouette?: string; zones: Zone[] }
type Leather = { id: number; src: string; name: string }

/**
 * SPIKE — leather-by-piece selector on a maquette line-drawing.
 * Technique: coloured zone polygons (bottom) + the line-art image on top with
 * `mix-blend-multiply` (white → transparent, black lines stay crisp) + an
 * interactive transparent layer for hover/click. Zones are hand-authored polygons
 * (the maquettes are raster line-art with open/dashed seams, so auto-segmentation
 * isn't reliable — final version would use proper vector maquettes).
 */
export default function MaqueteLeatherPicker({
  zonesUrl, leathers,
}: {
  zonesUrl: string
  leathers: Leather[]
}) {
  const [m, setM] = useState<Maquete | null>(null)
  const [assign, setAssign] = useState<Record<string, number>>({})
  const [brush, setBrush] = useState<number | null>(leathers[0]?.id ?? null)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => { fetch(zonesUrl).then(r => r.json()).then(setM) }, [zonesUrl])
  if (!m) return <div className="text-sm text-stone-400">Loading maquette…</div>

  const leatherOf = (zid: string) => leathers.find(l => l.id === assign[zid]) || null
  const paint = (zid: string) => { if (brush != null) setAssign(a => ({ ...a, [zid]: brush })) }
  const applyAll = () => { if (brush != null) setAssign(Object.fromEntries(m.zones.map(z => [z.id, brush]))) }

  return (
    <div className="flex flex-wrap gap-8">
      {/* ── Maquette canvas ── */}
      <div className="relative w-[600px] max-w-full" style={{ aspectRatio: '600 / 279' }}>
        {/* bottom: coloured leather fills */}
        <svg viewBox={m.viewBox} className="absolute inset-0 h-full w-full">
          <defs>
            {leathers.map(l => (
              <pattern key={l.id} id={`lp-${m.id}-${l.id}`} patternUnits="userSpaceOnUse" width="120" height="120">
                <image href={l.src} x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid slice" />
              </pattern>
            ))}
            {m.silhouette && <clipPath id={`sil-${m.id}`}><polygon points={m.silhouette} /></clipPath>}
          </defs>
          <g clipPath={m.silhouette ? `url(#sil-${m.id})` : undefined}>
            {m.zones.map(z => {
              const lid = assign[z.id]
              return <polygon key={z.id} points={z.points}
                fill={lid != null ? `url(#lp-${m.id}-${lid})` : '#ffffff'} />
            })}
          </g>
        </svg>
        {/* middle: line-art on top, multiply keeps lines, drops white */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.image} alt={`maquette ${m.id}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ mixBlendMode: 'multiply' }} />
        {/* top: interactive transparent zones */}
        <svg viewBox={m.viewBox} className="absolute inset-0 h-full w-full">
          {m.zones.map(z => (
            <polygon key={z.id} points={z.points}
              fill="transparent"
              stroke={hover === z.id ? '#B8975A' : 'transparent'} strokeWidth={2}
              className="cursor-pointer"
              onMouseEnter={() => setHover(z.id)} onMouseLeave={() => setHover(null)}
              onClick={() => paint(z.id)} />
          ))}
        </svg>
        {hover && (
          <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-stone-800/85 px-3 py-1 text-xs text-white">
            {m.zones.find(z => z.id === hover)?.name}
          </div>
        )}
      </div>

      {/* ── Palette + piece list ── */}
      <div className="w-72">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gold">Leathers</h3>
          <button onClick={applyAll} className="text-[11px] text-stone-500 underline hover:text-gold">apply to all</button>
        </div>
        <div className="mb-6 grid grid-cols-4 gap-2">
          {leathers.map(l => (
            <button key={l.id} title={l.name} onClick={() => setBrush(l.id)}
              className={`relative h-14 w-full overflow-hidden rounded-lg border-2 transition-all
                ${brush === l.id ? 'border-gold ring-2 ring-gold/30' : 'border-stone-200 hover:border-gold/50'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.src} alt={l.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold">Pieces</h3>
        <ul className="space-y-1.5">
          {m.zones.map((z, i) => {
            const l = leatherOf(z.id)
            return (
              <li key={z.id}
                onMouseEnter={() => setHover(z.id)} onMouseLeave={() => setHover(null)}
                onClick={() => paint(z.id)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition-colors
                  ${hover === z.id ? 'border-gold bg-gold/5' : 'border-stone-200'}`}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-100 text-[10px] text-stone-500">{i + 1}</span>
                <span className="flex-1 text-stone-700">{z.name}</span>
                {l
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={l.src} alt={l.name} className="h-6 w-6 rounded object-cover" />
                  : <span className="text-[11px] text-stone-300">—</span>}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
