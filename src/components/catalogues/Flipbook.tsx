'use client'

import { useEffect, useRef, useState } from 'react'
import { PageFlip } from 'page-flip'

/**
 * A page-curl flip-book over pre-rendered catalogue leaves. The book rejoins
 * left/right leaves two-up on wide screens (spine in the middle, just like the
 * printed catalogue) and falls back to a single page on narrow screens.
 */
export default function Flipbook({ pages, labels }: {
  pages: string[]
  labels: { prev: string; next: string; page: string }
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const flipRef = useRef<PageFlip | null>(null)
  const [current, setCurrent] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const pf = new PageFlip(host, {
      width: 500,
      height: 707, // single A4 leaf (≈1 : √2)
      size: 'stretch',
      minWidth: 300,
      maxWidth: 700,
      minHeight: 420,
      maxHeight: 990,
      showCover: true,
      usePortrait: true,
      mobileScrollSupport: true,
      drawShadow: true,
      maxShadowOpacity: 0.5,
      flippingTime: 800,
    })

    pf.loadFromImages(pages)
    pf.on('flip', (e) => setCurrent(e.data as number))
    pf.on('init', () => setReady(true))
    flipRef.current = pf

    return () => { pf.destroy(); flipRef.current = null }
  }, [pages])

  // Keyboard arrows leaf the book.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') flipRef.current?.flipNext()
      if (e.key === 'ArrowLeft') flipRef.current?.flipPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const total = pages.length

  return (
    <div className="w-full">
      <div className="relative">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        )}
        {/* page-flip mutates this node; keep it free of React-managed children */}
        <div ref={hostRef} className="mx-auto" style={{ width: '100%', maxWidth: 1000 }} />
      </div>

      {/* Controls */}
      <div className={`mt-6 flex items-center justify-center gap-6 transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={() => flipRef.current?.flipPrev()}
          disabled={current <= 0}
          aria-label={labels.prev}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 text-stone-700 hover:border-gold hover:text-gold disabled:opacity-30 disabled:hover:border-stone-300 disabled:hover:text-stone-700 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <span className="min-w-[7rem] text-center text-sm tabular-nums text-stone-500">
          {labels.page.replace('{n}', String(current + 1)).replace('{total}', String(total))}
        </span>

        <button
          onClick={() => flipRef.current?.flipNext()}
          disabled={current >= total - 1}
          aria-label={labels.next}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 text-stone-700 hover:border-gold hover:text-gold disabled:opacity-30 disabled:hover:border-stone-300 disabled:hover:text-stone-700 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
