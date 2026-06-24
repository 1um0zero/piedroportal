import type { ReactNode } from 'react'

export type FootView = 'sole' | 'lateral'
export type FootSide = 'l' | 'r'

const SRC: Record<FootView, Record<FootSide, string>> = {
  sole:    { l: '/custom/foot/sole-l.svg',    r: '/custom/foot/sole-r.svg' },
  lateral: { l: '/custom/foot/lateral-l.svg', r: '/custom/foot/lateral-r.svg' },
}

/**
 * Empty gold foot template (sole / lateral, left / right) — the 2D analogue of the
 * OSB 3D GLB models. Renders just the foot outline; pass `children` to overlay
 * measurement markers / annotations positioned in the same box (use absolute
 * positioning with %), e.g. a dot at a metatarsal head or a girth line.
 *
 *   <FootTemplate view="sole" side="l">
 *     <span style={{ position:'absolute', left:'62%', top:'40%' }}>…</span>
 *   </FootTemplate>
 */
export default function FootTemplate({
  view, side, className = '', children,
}: {
  view: FootView
  side: FootSide
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={`relative inline-block ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SRC[view][side]} alt={`${view} ${side === 'l' ? 'left' : 'right'} foot`}
        className="block h-full w-full select-none" draggable={false} />
      {children}
    </div>
  )
}
