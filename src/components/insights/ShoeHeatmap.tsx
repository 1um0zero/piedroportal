'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ShoeHeatmap — paints addition occurrences onto a real Piedro shoe.
//
// The backdrop is the clean outer contour of an actual model maquette (the
// per-model technical side-drawing), extracted by scripts/build-shoe-maquette.mjs
// with its interior seams and colour numbers stripped. Heat is painted as
// blurred blobs clipped to the shoe silhouette (a warm floor fills the rest so
// there are never bare-white holes), then the crisp outline is drawn on top.
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

// The maquette render's own pixel space (see shoe-geometry.json). The canvas adds
// a band above and below for the label chips.
const IMG_W = geometry.width       // 1400
const IMG_H = geometry.height      // 669
const TOP_BAND = 140
const BOTTOM_BAND = 160
const VB_W = IMG_W
const VB_H = TOP_BAND + IMG_H + BOTTOM_BAND

const W = 280, H = 88              // chip box
const CHIP_TOP = 24
const CHIP_BOTTOM = VB_H - BOTTOM_BAND + 20

/**
 * Zone anchors, in the maquette's pixel space (heel left, toe right). `c` is the
 * heat centre, `r` its radii [rx, ry] (the sole is a long flat ellipse so it
 * reads along the whole base), `chip` the top-left of the label box on the full
 * canvas.
 */
const GEO: Record<ShoeZone, { c: [number, number]; r: [number, number]; chip: [number, number] }> = {
  ankle:   { c: [340, 180],  r: [140, 140], chip: [40, CHIP_TOP] },
  closure: { c: [690, 235],  r: [165, 150], chip: [560, CHIP_TOP] },
  upper:   { c: [930, 340],  r: [160, 150], chip: [1080, CHIP_TOP] },
  heel:    { c: [150, 380],  r: [150, 150], chip: [40, CHIP_BOTTOM] },
  sole:    { c: [700, 600],  r: [430, 80],  chip: [380, CHIP_BOTTOM] },
  joint:   { c: [1010, 430], r: [150, 140], chip: [720, CHIP_BOTTOM] },
  toe:     { c: [1255, 470], r: [150, 130], chip: [1080, CHIP_BOTTOM] },
}

/** Warm single-hue heat ramp (0 → max). Light "few" end matches the maquette so
 *  a cool zone reads as a faint tint on the shoe, not a hole. */
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

/** The colour the whole silhouette is tinted before the per-zone blobs, so gaps
 *  between blobs read as the "few" end of the ramp instead of bare white. */
const FLOOR = 0.05

export default function ShoeHeatmap({ zones, max, selectedZone, onSelectZone, className }: ShoeHeatmapProps) {
  const uid = useId().replace(/:/g, '')
  const maskId = `shoeMask-${uid}`, blurId = `soft-${uid}`
  const norm = max > 0 ? max : 1

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className={className} role="img"
         aria-label="Shoe with addition zones coloured by occurrence intensity">
      <defs>
        {/* Luminance mask straight from the maquette silhouette — heat can never
            bleed outside the real shoe outline. */}
        <mask id={maskId}>
          <image href="/insights/shoe-mask.png" x={0} y={TOP_BAND} width={IMG_W} height={IMG_H} />
        </mask>
        <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
      </defs>

      {/* Heat: a warm floor tint + per-zone blobs, clipped to the shoe */}
      <g mask={`url(#${maskId})`}>
        <rect x={0} y={TOP_BAND} width={IMG_W} height={IMG_H} fill={heat(FLOOR)} />
        <g filter={`url(#${blurId})`}>
          {zones.map(z => (
            <ellipse key={z.zone} cx={GEO[z.zone].c[0]} cy={GEO[z.zone].c[1] + TOP_BAND}
                     rx={GEO[z.zone].r[0]} ry={GEO[z.zone].r[1]}
                     fill={heat(z.count / norm)} opacity={0.9} />
          ))}
        </g>
      </g>

      {/* The clean shoe outline (from maquette 3467), drawn over the heat */}
      <image href="/insights/shoe-outline.png" x={0} y={TOP_BAND} width={IMG_W} height={IMG_H} />

      {/* Label chips */}
      <g>
        {zones.map(z => {
          const g = GEO[z.zone]
          const [bx, by] = g.chip
          const cx = g.c[0], cy = g.c[1] + TOP_BAND
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
                <rect x={bx} y={by} width={W} height={H} rx={16}
                      fill="#ffffff" fillOpacity={0.94}
                      stroke={z.outlier ? '#d03b3b' : selected ? '#B8975A' : 'rgba(27,23,18,0.12)'}
                      strokeWidth={z.outlier || selected ? 3 : 1.6} />
                <text x={bx + 22} y={by + 34} fill="#6b6258" fontSize={21} fontWeight={600}>{z.label}</text>
                <text x={bx + 22} y={by + 74} fill="#1b1712" fontSize={38} fontWeight={700}
                      style={{ fontVariantNumeric: 'tabular-nums' }}>{nz(z.count)}</text>
                {z.outlier && <text x={bx + W - 22} y={by + 74} fill="#d03b3b" fontSize={22} fontWeight={700} textAnchor="end">▲</text>}
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
