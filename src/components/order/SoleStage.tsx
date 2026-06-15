'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  values: string[]
  images: Record<string, string>          // value → image path (only those with photos)
  value: string | null                    // currently selected
  label: (v: string) => string
  startAt?: string | null
  onSelect: (v: string | null) => void
  onClose: () => void
}

const ZOOM = 2.4          // loupe magnification
const LENS = 200          // loupe diameter (px)
const MAX_TILT = 12       // deg

/**
 * Immersive "hologram stage" for inspecting & picking a sole: transparent floating
 * sole with mouse-parallax 3D tilt, a cursor-following loupe over the tread, and a
 * levitating thumbnail carousel to browse options. Portal-rendered over everything.
 */
export default function SoleStage({ values, images, value, label, startAt, onSelect, onClose }: Props) {
  const withImg = values.filter(v => images[v])
  const ordered = withImg.length ? withImg : values
  const initial = Math.max(0, ordered.indexOf(startAt ?? value ?? ordered[0]))
  const [idx, setIdx] = useState(initial)
  const active = ordered[idx]
  const src = images[active]

  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [lens, setLens] = useState<{ on: boolean; cx: number; cy: number; bgX: number; bgY: number; bw: number; bh: number }>(
    { on: false, cx: 0, cy: 0, bgX: 0, bgY: 0, bw: 0, bh: 0 })
  const imgRef = useRef<HTMLImageElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const go = (d: number) => { setIdx(i => (i + d + ordered.length) % ordered.length); setLens(l => ({ ...l, on: false })) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Enter') { onSelect(active); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, ordered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Parallax tilt from cursor anywhere on the stage.
  const onStageMove = (e: React.MouseEvent) => {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2
    setTilt({ y: ((e.clientX - cx) / cx) * MAX_TILT, x: -((e.clientY - cy) / cy) * MAX_TILT })
  }

  // Loupe over the big image.
  const onImgMove = (e: React.MouseEvent) => {
    const el = imgRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    if (x < 0 || y < 0 || x > r.width || y > r.height) { setLens(l => ({ ...l, on: false })); return }
    const bw = r.width * ZOOM, bh = r.height * ZOOM
    setLens({ on: true, cx: e.clientX, cy: e.clientY, bw, bh, bgX: -(x * ZOOM - LENS / 2), bgY: -(y * ZOOM - LENS / 2) })
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, rgba(12,10,7,0.72), rgba(12,10,7,0.88))', backdropFilter: 'blur(6px)' }}
      onMouseMove={onStageMove}
      onClick={onClose}>

      {/* Close */}
      <button type="button" onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white
                   flex items-center justify-center transition-colors" aria-label="Close">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {/* Stage (stop propagation so clicks here don't close) */}
      <div className="relative flex flex-col items-center" onClick={e => e.stopPropagation()}
        style={{ perspective: '1400px' }}>

        {/* arrows */}
        {ordered.length > 1 && <>
          <button type="button" onClick={() => go(-1)}
            className="absolute -left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25
                       text-white flex items-center justify-center transition-colors" aria-label="Previous">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button type="button" onClick={() => go(1)}
            className="absolute -right-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25
                       text-white flex items-center justify-center transition-colors" aria-label="Next">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </>}

        {/* glow */}
        <div className="pointer-events-none absolute inset-[-12%]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(184,151,90,0.5) 0%, rgba(184,151,90,0) 70%)', filter: 'blur(34px)' }} />

        {/* the hologram */}
        <div style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: 'preserve-3d', transition: 'transform 80ms ease-out' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={src} alt={active}
            onMouseMove={onImgMove} onMouseLeave={() => setLens(l => ({ ...l, on: false }))}
            onClick={() => { onSelect(active); onClose() }}
            className="sole-holo-img cursor-zoom-in select-none"
            style={{ maxHeight: '64vh', maxWidth: 'min(78vw, 640px)', objectFit: 'contain' }} draggable={false} />
        </div>

        {/* label + select */}
        <div className="relative mt-5 flex items-center gap-3">
          <span className="px-4 py-1.5 rounded-full bg-white/95 text-stone-800 text-sm font-semibold shadow-lg">{label(active)}</span>
          <button type="button" onClick={() => { onSelect(active); onClose() }}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg transition-colors
              ${value === active ? 'bg-gold/30 text-white ring-1 ring-gold' : 'bg-gold text-white hover:bg-gold-dark'}`}>
            {value === active ? '✓ Selected' : 'Select'}
          </button>
        </div>
      </div>

      {/* levitating carousel */}
      {ordered.length > 1 && (
        <div className="relative mt-8 flex items-end gap-3 px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md
                        shadow-2xl max-w-[90vw] overflow-x-auto" onClick={e => e.stopPropagation()}>
          {ordered.map((v, i) => (
            <button key={v} type="button" onClick={() => { setIdx(i); setLens(l => ({ ...l, on: false })) }}
              title={label(v)}
              className={`shrink-0 rounded-xl p-1.5 transition-all duration-200
                ${i === idx ? 'bg-white/90 ring-2 ring-gold scale-110' : 'bg-white/40 hover:bg-white/70 opacity-80 hover:opacity-100'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[v]} alt={v} className="w-14 h-14 object-contain pointer-events-none" draggable={false} />
            </button>
          ))}
        </div>
      )}

      {/* loupe lens */}
      {lens.on && (
        <div className="pointer-events-none fixed rounded-full border-2 border-white/70 shadow-2xl z-[95]"
          style={{
            width: LENS, height: LENS, left: lens.cx - LENS / 2, top: lens.cy - LENS / 2,
            backgroundImage: `url(${src})`, backgroundRepeat: 'no-repeat',
            backgroundSize: `${lens.bw}px ${lens.bh}px`, backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }} />
      )}
    </div>,
    document.body,
  )
}
