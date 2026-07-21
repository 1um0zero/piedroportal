'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ShoeHeatmap — paints addition occurrences onto the REAL Piedro last.
//
// The backdrop is a baked side view of `no_additions_l.glb` — the same clean
// model the CUSTOM 3D preview uses as its base — rendered to an image by
// scripts/build-shoe-maquette.mjs. Heat is drawn as blurred blobs multiplied
// over that render and masked to its exact silhouette, so the 3D shading shows
// through the colour and nothing bleeds outside the shoe.
//
// Presentational only: it receives already-aggregated, already-translated zone
// data and reports clicks. All numbers/labels come from props, so the component
// carries no i18n or data-fetching of its own.
// ─────────────────────────────────────────────────────────────────────────────

import { useId } from 'react'
import type { ShoeZone } from '@/lib/insights/addition-zones'
import { nz } from '@/lib/format'
import geometry from './shoe-geometry.json'

export interface HeatZone {
  zone:     ShoeZone
  label:    string
  count:    number
  outlier?: boolean
}

interface ShoeHeatmapProps {
  zones:         HeatZone[]
  /** Population max zone count, for heat normalization. */
  max:           number
  selectedZone?: ShoeZone | null
  onSelectZone?: (zone: ShoeZone) => void
  className?:    string
}

// The baked render's own pixel space (see shoe-geometry.json). The canvas adds a
// band above and below for the label chips.
const IMG_W = geometry.width      // 1600
const IMG_H = geometry.height     // 1000
const TOP_BAND = 190
const BOTTOM_BAND = 210
const VB_W = IMG_W
const VB_H = TOP_BAND + IMG_H + BOTTOM_BAND

// Chip box.
const W = 300, H = 96

/**
 * Zone anchors, in the render's pixel space (the shoe silhouette occupies
 * x 86…1515, y 246…755 — heel left, toe right). `c` is the heat centre, `r` its
 * radii [rx, ry] (the sole is a long flat ellipse so it reads along the whole
 * base rather than as a blob), `chip` the top-left of the label box.
 */
const GEO: Record<ShoeZone, { c: [number, number]; r: [number, number]; chip: [number, number] }> = {
  ankle:   { c: [300, 300],  r: [140, 140], chip: [40, 34] },
  closure: { c: [620, 330],  r: [165, 165], chip: [530, 34] },
  upper:   { c: [890, 455],  r: [170, 170], chip: [1080, 34] },
  toe:     { c: [1340, 645], r: [160, 150], chip: [1250, VB_H - 150] },
  joint:   { c: [1090, 610], r: [155, 155], chip: [860, VB_H - 150] },
  sole:    { c: [800, 730],  r: [470, 145], chip: [470, VB_H - 150] },
  heel:    { c: [175, 545],  r: [170, 170], chip: [40, VB_H - 150] },
}

/**
 * Warm single-hue heat ramp (0 → max). Kept light and saturated rather than dark:
 * the shoe render is multiplied ON TOP of this, which darkens it again, so a ramp
 * tuned to look right on its own would come out muddy brown in the composite.
 */
export const HEAT_STOPS: [number, string][] = [
  [0, '#fdf4e9'], [0.15, '#fbd9a8'], [0.35, '#f7b36a'],
  [0.55, '#f0873c'], [0.75, '#dd5a1e'], [1, '#b83a10'],
]
const STOPS = HEAT_STOPS
function hx(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}
function heat(t: number): string {
  const c = Math.max(0, Math.min(1, t))
  for (let i = 1; i < STOPS.length; i++) {
    if (c <= STOPS[i][0]) {
      const [a0, a1] = STOPS[i - 1], [b0, b1] = STOPS[i]
      const f = (c - a0) / (b0 - a0), ca = hx(a1), cb = hx(b1)
      return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * f)},${Math.round(ca[1] + (cb[1] - ca[1]) * f)},${Math.round(ca[2] + (cb[2] - ca[2]) * f)})`
    }
  }
  return STOPS[STOPS.length - 1][1]
}

/** How far the render is lifted toward white before being multiplied over the
 *  heat. 1 = full-strength shading (crushes the colour), 0 = no form at all. */
const SHADE_STRENGTH = 0.7

export default function ShoeHeatmap({ zones, max, selectedZone, onSelectZone, className }: ShoeHeatmapProps) {
  const uid = useId().replace(/:/g, '')
  const maskId = `shoeMask-${uid}`, blurId = `soft-${uid}`, shadeId = `shade-${uid}`
  const norm = max > 0 ? max : 1

  // `isolation: isolate` keeps the multiply blend inside this SVG — without it
  // the shoe would darken whatever card sits behind it.
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className={className} role="img"
         style={{ isolation: 'isolate' }}
         aria-label="Shoe with addition zones coloured by occurrence intensity">
      <defs>
        {/* Luminance mask straight from the render's alpha — heat can never
            bleed outside the real silhouette. */}
        <mask id={maskId}>
          <image href="/insights/shoe-mask.png" x={0} y={TOP_BAND} width={IMG_W} height={IMG_H} />
        </mask>
        <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="34" />
        </filter>
        {/* Lift the render toward white so multiplying it over the heat adds
            form without crushing the colour. */}
        <filter id={shadeId} x="0%" y="0%" width="100%" height="100%">
          <feComponentTransfer>
            <feFuncR type="linear" slope={SHADE_STRENGTH} intercept={1 - SHADE_STRENGTH} />
            <feFuncG type="linear" slope={SHADE_STRENGTH} intercept={1 - SHADE_STRENGTH} />
            <feFuncB type="linear" slope={SHADE_STRENGTH} intercept={1 - SHADE_STRENGTH} />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* Heat first, clipped to the real silhouette… */}
      <g mask={`url(#${maskId})`}>
        <g filter={`url(#${blurId})`}>
          {zones.map(z => (
            <ellipse key={z.zone} cx={GEO[z.zone].c[0]} cy={GEO[z.zone].c[1] + TOP_BAND}
                     rx={GEO[z.zone].r[0]} ry={GEO[z.zone].r[1]}
                     fill={heat(z.count / norm)} opacity={0.85} />
          ))}
        </g>
      </g>

      {/* …then the real last (baked from no_additions_l.glb) multiplied over it,
          so the 3D form reads through the colour. */}
      <image href="/insights/shoe.webp" x={0} y={TOP_BAND} width={IMG_W} height={IMG_H}
             filter={`url(#${shadeId})`} style={{ mixBlendMode: 'multiply' }} />

      {/* Label chips */}
      <g>
        {zones.map(z => {
          const g = GEO[z.zone]
          const [bx, by] = g.chip
          const cx = g.c[0], cy = g.c[1] + TOP_BAND
          // Leader starts at the chip edge nearest the zone.
          const anchorX = Math.max(bx, Math.min(cx, bx + W))
          const anchorY = by < cy ? by + H : by
          const selected = selectedZone === z.zone
          return (
            <g key={z.zone}>
              <path d={`M${anchorX} ${anchorY} L${cx} ${cy}`}
                    stroke="rgba(138,125,108,0.5)" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              <g role="button" tabIndex={0} aria-pressed={selected} aria-label={`${z.label}: ${z.count}`}
                 style={{ cursor: onSelectZone ? 'pointer' : 'default' }}
                 onClick={() => onSelectZone?.(z.zone)}
                 onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectZone?.(z.zone) } }}>
                <rect x={bx} y={by} width={W} height={H} rx={18}
                      fill="#ffffff" fillOpacity={0.94}
                      stroke={z.outlier ? '#d03b3b' : selected ? '#B8975A' : 'rgba(27,23,18,0.12)'}
                      strokeWidth={z.outlier || selected ? 3 : 1.6} />
                <text x={bx + 24} y={by + 38} fill="#6b6258" fontSize={22} fontWeight={600}>{z.label}</text>
                <text x={bx + 24} y={by + 80} fill="#1b1712" fontSize={42} fontWeight={700}
                      style={{ fontVariantNumeric: 'tabular-nums' }}>{nz(z.count)}</text>
                {z.outlier && <text x={bx + W - 26} y={by + 80} fill="#d03b3b" fontSize={24} fontWeight={700} textAnchor="end">▲</text>}
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
