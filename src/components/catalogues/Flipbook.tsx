'use client'

import { useEffect, useRef, useState } from 'react'
import { PageFlip } from 'page-flip'

/**
 * A page-curl flip-book over pre-rendered catalogue leaves. The book rejoins
 * left/right leaves two-up on wide screens (spine in the middle, just like the
 * printed catalogue) and falls back to a single page on narrow screens.
 *
 * Leaves are lazy-loaded through a sliding window (HTML render mode, so each
 * <img> is a live DOM node whose src we set/clear on demand). A ~130-leaf book
 * therefore opens after fetching only the first few pages instead of all ~13 MB
 * up-front — much faster first paint and far less mobile data. The window keeps
 * several leaves loaded AHEAD of the reader so a leaf is always decoded before
 * the flip animation reveals it (no blank pages), and unloads leaves far behind
 * so the number of decoded images stays bounded (memory-safe on mobile). A
 * flipped-back leaf reloads effectively instantly from the 31-day CDN/browser
 * cache.
 */
const AHEAD = 5   // leaves to preload ahead of the current one (reading forward)
const BEHIND = 3  // leaves to preload behind
const KEEP = 8    // keep loaded within ±KEEP; unload beyond (hysteresis vs AHEAD)

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

    // Build the leaf elements imperatively — page-flip moves them into its own
    // DOM, so they must NOT be React-managed. We keep references to each <img>
    // to drive the lazy-load window.
    const imgs: HTMLImageElement[] = []
    const pageEls: HTMLElement[] = pages.map(() => {
      const leaf = document.createElement('div')
      leaf.style.width = '100%'
      leaf.style.height = '100%'
      leaf.style.backgroundColor = '#faf9f7' // soft placeholder while unloaded
      leaf.style.overflow = 'hidden'

      const img = document.createElement('img')
      img.alt = ''
      img.decoding = 'async'
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = 'cover'
      img.style.display = 'block'
      img.style.opacity = '0'
      img.style.transition = 'opacity 250ms ease'
      img.addEventListener('load', () => { img.style.opacity = '1' })

      leaf.appendChild(img)
      imgs.push(img)
      return leaf
    })

    // Sliding window: load [cur-BEHIND, cur+AHEAD], unload outside [cur±KEEP].
    const loaded = new Array(pages.length).fill(false)
    const applyWindow = (cur: number) => {
      for (let i = 0; i < imgs.length; i++) {
        const inLoad = i >= cur - BEHIND && i <= cur + AHEAD
        const inKeep = i >= cur - KEEP && i <= cur + KEEP
        if (inLoad && !loaded[i]) {
          imgs[i].src = pages[i]
          loaded[i] = true
        } else if (!inKeep && loaded[i]) {
          imgs[i].removeAttribute('src')
          imgs[i].style.opacity = '0'
          loaded[i] = false
        }
      }
    }

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

    pf.loadFromHTML(pageEls)
    applyWindow(0) // start fetching the opening leaves immediately
    pf.on('flip', (e) => {
      const idx = e.data as number
      setCurrent(idx)
      applyWindow(idx)
    })
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
