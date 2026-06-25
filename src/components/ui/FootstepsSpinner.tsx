'use client'

/**
 * FootstepsSpinner — themed loader for Piedro.
 *
 * Golden footprints appear one after another along a gentle walking path
 * (left, right, left, right…) then fade as the trail loops — a literal
 * "always one step ahead". Pure CSS/SVG, zero dependencies.
 *
 * NOT public yet — previewed in /admin/spinner-lab.
 */

type Props = {
  /** Diameter of the trail in px (height of the footprint band). */
  size?: number
  /** Optional caption shown under the trail (e.g. a loading message). */
  label?: string
  className?: string
}

// One left + one right footprint, repeated along the path.
const STEPS = [
  { side: 'l', x: 0 },
  { side: 'r', x: 1 },
  { side: 'l', x: 2 },
  { side: 'r', x: 3 },
  { side: 'l', x: 4 },
  { side: 'r', x: 5 },
] as const

function Footprint({ side }: { side: 'l' | 'r' }) {
  // A simple stylised sole: heel pad + ball pad + 5 toe dots.
  const flip = side === 'r' ? 'scale(-1,1) translate(-24,0)' : undefined
  return (
    <svg viewBox="0 0 24 40" width="100%" height="100%" aria-hidden>
      <g transform={flip} fill="currentColor">
        {/* sole body */}
        <path d="M8 14 C5 16 5 24 7 30 C8 35 16 35 17 30 C19 24 19 16 16 14 C14 12 10 12 8 14 Z" />
        {/* heel */}
        <ellipse cx="12" cy="33" rx="5" ry="4" />
        {/* toes */}
        <circle cx="7" cy="9" r="1.7" />
        <circle cx="10.5" cy="6.5" r="1.9" />
        <circle cx="14" cy="6" r="1.9" />
        <circle cx="17" cy="7.5" r="1.7" />
        <circle cx="19.5" cy="10" r="1.5" />
      </g>
    </svg>
  )
}

export default function FootstepsSpinner({ size = 40, label, className }: Props) {
  const stepW = size * 0.55
  const trailW = stepW * STEPS.length
  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
    >
      <div
        className="piedro-footsteps text-gold"
        style={{ position: 'relative', width: trailW, height: size * 1.2 }}
      >
        {STEPS.map((s, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: s.x * stepW,
              top: s.side === 'l' ? 0 : size * 0.3, // right foot rides slightly lower
              width: stepW * 0.8,
              height: size,
              animationDelay: `${i * 0.18}s`,
            }}
          >
            <Footprint side={s.side} />
          </span>
        ))}
      </div>
      {label ? (
        <span style={{ fontSize: 13, letterSpacing: '0.04em' }} className="text-stone-500">
          {label}
        </span>
      ) : null}

      <style jsx>{`
        .piedro-footsteps span {
          opacity: 0;
          animation: piedro-step 2.1s ease-in-out infinite;
        }
        @keyframes piedro-step {
          0%,
          100% {
            opacity: 0;
            transform: translateY(2px) scale(0.9);
          }
          12%,
          55% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          70% {
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .piedro-footsteps span {
            animation: none;
            opacity: 0.55;
          }
        }
      `}</style>
    </div>
  )
}
