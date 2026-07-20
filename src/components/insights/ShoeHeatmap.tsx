'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ShoeHeatmap — paints addition occurrences onto a generic shoe maquette.
//
// Presentational only: it receives already-aggregated, already-translated zone
// data and reports clicks. All numbers/labels come from props so the component
// carries no i18n or data-fetching of its own. Heat colour is a single warm hue
// (light → dark) computed from each zone's share of the population max.
// ─────────────────────────────────────────────────────────────────────────────

import { useId } from 'react'
import type { ShoeZone } from '@/lib/insights/addition-zones'

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

// Fixed shoe geometry (viewBox 0 0 760 500): each zone's heat centre + the
// position of its label chip and the leader-line anchor. Toe points right.
const GEO: Record<ShoeZone, { c: [number, number]; chip: [number, number]; align: 'l' | 'r' | 'c'; r: number }> = {
  toe:     { c: [600, 250], chip: [602, 352], align: 'r', r: 74 },
  upper:   { c: [492, 196], chip: [604, 150], align: 'r', r: 72 },
  closure: { c: [356, 164], chip: [300, 44],  align: 'c', r: 80 },
  ankle:   { c: [232, 150], chip: [40, 56],   align: 'l', r: 66 },
  heel:    { c: [178, 232], chip: [40, 300],  align: 'l', r: 74 },
  joint:   { c: [302, 238], chip: [118, 432], align: 'l', r: 68 },
  sole:    { c: [398, 306], chip: [400, 432], align: 'c', r: 96 },
}

// Warm single-hue heat ramp (0 → max).
const STOPS: [number, string][] = [
  [0, '#f7ead9'], [0.15, '#f6cf9f'], [0.35, '#f0a45c'],
  [0.55, '#e5762f'], [0.75, '#c9511a'], [1, '#98350b'],
]
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

const W = 150, H = 56

export default function ShoeHeatmap({ zones, max, selectedZone, onSelectZone, className }: ShoeHeatmapProps) {
  const uid = useId().replace(/:/g, '')
  const clipId = `shoeClip-${uid}`, blurId = `soft-${uid}`
  const norm = max > 0 ? max : 1

  return (
    <svg viewBox="0 0 760 500" className={className} role="img"
         aria-label="Shoe with addition zones coloured by occurrence intensity">
      <defs>
        <clipPath id={clipId}>
          <path d="M118 292 C104 232 120 168 182 150 C214 141 240 143 262 156 C274 163 286 174 300 176 C316 178 330 168 356 152 C372 143 386 150 402 150 C470 150 520 176 560 196 C600 216 636 232 660 262 C672 276 664 288 636 290 L150 290 C132 290 124 292 118 292 Z" />
          <path d="M118 290 L636 290 C664 290 678 297 668 307 C646 323 210 324 152 321 C130 320 106 314 118 300 Z" />
        </clipPath>
        <filter id={blurId} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="15" />
        </filter>
      </defs>

      {/* shoe body: base fill + heat blobs, clipped to the silhouette */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="90" y="120" width="600" height="220" fill="#efe7db" />
        <g filter={`url(#${blurId})`}>
          {zones.map(z => (
            <circle key={z.zone} cx={GEO[z.zone].c[0]} cy={GEO[z.zone].c[1]} r={GEO[z.zone].r}
                    fill={heat(z.count / norm)} opacity={0.95} />
          ))}
        </g>
      </g>

      {/* outline + seams */}
      <g fill="none" stroke="#8a7d6c" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        <path d="M118 292 C104 232 120 168 182 150 C214 141 240 143 262 156 C274 163 286 174 300 176 C316 178 330 168 356 152 C372 143 386 150 402 150 C470 150 520 176 560 196 C600 216 636 232 660 262 C672 276 664 288 636 290" />
        <path d="M118 290 L636 290 C664 290 678 297 668 307 C646 323 210 324 152 321 C130 320 106 314 118 300 Z" />
      </g>
      <g fill="none" stroke="rgba(138,125,108,0.55)" strokeWidth={1.5} strokeLinecap="round">
        <path d="M556 198 C566 236 576 266 592 289" />
        <path d="M204 152 C194 208 198 258 208 289" />
        <path d="M300 176 C318 184 340 184 360 172" />
        <path d="M338 168 L360 200 M356 160 L380 196 M374 154 L400 192" />
      </g>

      {/* label chips */}
      <g>
        {zones.map(z => {
          const g = GEO[z.zone]
          const [px, py] = g.chip
          const bx = g.align === 'r' ? px : g.align === 'l' ? px : px - W / 2
          const leadX = g.align === 'l' ? bx + W : g.align === 'r' ? bx : bx + W / 2
          const selected = selectedZone === z.zone
          return (
            <g key={z.zone}>
              <path d={`M${leadX} ${py + H / 2} L${g.c[0]} ${g.c[1]}`}
                    stroke="rgba(138,125,108,0.55)" strokeWidth={1.2} strokeDasharray="3 3" fill="none" />
              <g role="button" tabIndex={0} aria-pressed={selected} aria-label={`${z.label}: ${z.count}`}
                 style={{ cursor: onSelectZone ? 'pointer' : 'default' }}
                 onClick={() => onSelectZone?.(z.zone)}
                 onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectZone?.(z.zone) } }}>
                <rect x={bx} y={py} width={W} height={H} rx={11}
                      fill="#ffffff"
                      stroke={z.outlier ? '#d03b3b' : selected ? '#B8975A' : 'rgba(27,23,18,0.12)'}
                      strokeWidth={z.outlier || selected ? 2 : 1} />
                <text x={bx + 14} y={py + 22} fill="#6b6258" fontSize={12.5} fontWeight={600}>{z.label}</text>
                <text x={bx + 14} y={py + 47} fill="#1b1712" fontSize={25} fontWeight={700}
                      style={{ fontVariantNumeric: 'tabular-nums' }}>{z.count.toLocaleString()}</text>
                {z.outlier && <text x={bx + W - 16} y={py + 47} fill="#d03b3b" fontSize={12} fontWeight={700} textAnchor="end">▲</text>}
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
