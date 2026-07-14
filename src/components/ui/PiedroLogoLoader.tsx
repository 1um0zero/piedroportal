'use client'

/**
 * PiedroLogoLoader — themed loader built from the brand's own foot mark.
 *
 * The Piedro logo's feet are made of 56 diagonal straps. Here a golden light
 * travels across them, heel -> toe, in a seamless loop — the foot "builds
 * itself" one strap at a time. A literal "always one step ahead".
 *
 * Pure inline SVG/CSS, zero dependencies, no external asset or licence.
 * Colour follows `text-gold`; respects prefers-reduced-motion.
 *
 * Data (paths + centroids) is generated from public/brand/piedro-logo.svg by
 * scripts/extract-feet.mjs.
 */

import { FEET_STRAPS } from './piedro-feet-paths'

type Props = {
  /** Rendered height of the foot mark in px. */
  size?: number
  /** Optional caption shown under the mark (e.g. a loading message). */
  label?: string
  /** Seconds for one full heel -> toe sweep. */
  duration?: number
  className?: string
}

// Foot mark bounds (from the source SVG), padded a touch.
const VB = { x: -2, y: -2, w: 120, h: 188 }
const ASPECT = VB.w / VB.h

// Normalise centroid-x to [0,1] so the sweep runs heel (left) -> toe (right).
const CX_MIN = Math.min(...FEET_STRAPS.map(s => s.cx))
const CX_MAX = Math.max(...FEET_STRAPS.map(s => s.cx))

export default function PiedroLogoLoader({
  size = 56,
  label,
  duration = 1.8,
  className,
}: Props) {
  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
    >
      <svg
        className="piedro-feet text-gold"
        width={size * ASPECT}
        height={size}
        viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
        role="img"
        aria-label={label || 'Loading'}
      >
        {FEET_STRAPS.map((s, i) => {
          const n = (s.cx - CX_MIN) / (CX_MAX - CX_MIN || 1) // 0 = heel, 1 = toe
          return (
            <path
              key={i}
              d={s.d}
              fill="currentColor"
              style={{
                // Negative delay so the wave is already mid-flight on frame 0.
                animationDelay: `${(n - 1) * duration}s`,
                animationDuration: `${duration}s`,
              }}
            />
          )
        })}
      </svg>

      {label ? (
        <span style={{ fontSize: 13, letterSpacing: '0.04em' }} className="text-stone-500">
          {label}
        </span>
      ) : null}

      <style jsx>{`
        .piedro-feet path {
          opacity: 0.12;
          animation-name: piedro-feet-wave;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes piedro-feet-wave {
          0%,
          100% {
            opacity: 0.12;
          }
          50% {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .piedro-feet path {
            animation: none;
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  )
}
