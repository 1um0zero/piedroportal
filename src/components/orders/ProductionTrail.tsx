'use client'

import { ReactNode } from 'react'
import { PRODUCTION_SEQUENCE } from '@/lib/order-status'

/**
 * The production trail — a connected row of SVG icons that light up (gold) as an
 * order advances through the VSI shop floor. Done steps are gold, the current
 * step gets a pulsing ring, future steps are ghosted. Hover an icon for its
 * (translated) name.
 *
 * `label` translates a production-state value to the user's locale.
 */
type Props = {
  state: string
  label: (value: string) => string
  /** icon edge size in px (trail scales with it). Default 14 (list view). */
  size?: number
  className?: string
  /** Override the trail steps (e.g. the simplified client sequence). */
  sequence?: readonly string[]
  /** Override the current step index (when `state` isn't a member of `sequence`). */
  current?: number
}

function Glyph({ children, size }: { children: ReactNode; size: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// One line-art glyph per stage, evoking the real craft step.
const GLYPHS: Record<string, ReactNode> = {
  // order received — inbox
  order_received: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  // in preparation — clipboard
  in_preparation: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  // modeling — ruler / pattern measuring
  modeling: (
    <>
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
      <path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" />
    </>
  ),
  // preparing (lasts/forms) — footprints
  preparing: (
    <>
      <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
      <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" />
      <path d="M16 17h4M4 13h4" />
    </>
  ),
  // cutting — leather clicking knife
  cutting: (
    <>
      <path d="M3.5 20.5 13 11" />
      <path d="M13 11l5.3-5.3a1.7 1.7 0 0 0-2.4-2.4L10.6 8.6Z" />
      <path d="M3.5 20.5H2.6v-.9" />
    </>
  ),
  // stitching — rows of stitches in leather
  stitching: (
    <>
      <path d="M3 9c5-3.3 13-3.3 18 0" strokeDasharray="2.4 2.6" />
      <path d="M3 15c5-3.3 13-3.3 18 0" strokeDasharray="2.4 2.6" />
    </>
  ),
  // mounting — a boot on its last
  mounting: (
    <>
      <path d="M4 4v9l-1.6 4.3A1 1 0 0 0 3.3 19H19a2 2 0 0 0 2-2c0-2.4-1.9-3.4-4.3-4L12 11.5V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1z" />
      <path d="M4 13h4" />
    </>
  ),
  // finishing — sparkles / polish
  finishing: (
    <>
      <path d="M12 2.5l1.6 5.1a2 2 0 0 0 1.3 1.3L20 10.5l-5.1 1.6a2 2 0 0 0-1.3 1.3L12 18.5l-1.6-5.1a2 2 0 0 0-1.3-1.3L4 10.5l5.1-1.6a2 2 0 0 0 1.3-1.3z" />
      <path d="M19 15v3M20.5 16.5h-3M5 4v2M6 5H4" />
    </>
  ),
  // delivered — truck
  delivered: (
    <>
      <path d="M14 18V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1" />
      <path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-1" />
      <path d="M9 18h2" />
      <circle cx="6.5" cy="18" r="1.8" />
      <circle cx="16.5" cy="18" r="1.8" />
    </>
  ),
}

export function ProductionTrail({ state, label, size = 14, className, sequence, current: currentOverride }: Props) {
  const seq = sequence ?? PRODUCTION_SEQUENCE
  // 'delivered' = production finished: every step done, no current pulse.
  const current = currentOverride ?? (state === 'delivered'
    ? seq.length
    : (seq as readonly string[]).indexOf(state))
  if (current < 0) return null // off-trail (fitting/dispatched) — parent shows a chip

  return (
    <div
      className={`flex items-center ${className ?? ''}`}
      role="img"
      aria-label={`${label(state)} — ${Math.min(current + 1, seq.length)}/${seq.length}`}
    >
      {seq.map((step, i) => {
        const done = i < current
        const isCurrent = i === current
        return (
          <div key={step} className="flex items-center">
            {i > 0 && (
              <span
                className={`h-px transition-colors ${i <= current ? 'bg-gold' : 'bg-stone-200'}`}
                style={{ width: Math.round(size * 0.55) }}
              />
            )}
            <span
              title={label(step)}
              className={`relative inline-flex items-center justify-center rounded-full transition-colors ${
                done || isCurrent ? 'text-gold' : 'text-stone-300'
              } ${isCurrent ? 'drop-shadow-[0_0_2px_rgba(184,151,90,0.55)]' : ''}`}
            >
              {isCurrent && (
                <span className="absolute -inset-1 rounded-full ring-2 ring-gold/40 animate-[pulse_2s_ease-in-out_infinite]" />
              )}
              <Glyph size={size}>{GLYPHS[step]}</Glyph>
            </span>
          </div>
        )
      })}
    </div>
  )
}
