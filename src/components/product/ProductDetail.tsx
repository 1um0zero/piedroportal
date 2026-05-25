'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { isNew } from '@/components/gallery/GalleryPage'
import { translateFilterValueSync, preloadFilterTranslations } from '@/lib/filter-translations'
import type { Product, Locale } from '@/types'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`
const src = (name: string) => `${BUCKET}/${name}`

const LENS = 160   // lens diameter px
const ZOOM = 2.5   // magnification

// ── Loupe magnifier (classic e-commerce style) ────────────────────────────────
function ZoomImage({ url, alt }: { url: string; alt: string }) {
  const [pos, setPos]     = useState<{ x: number; y: number } | null>(null)
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 })  // natural size
  const containerRef      = useRef<HTMLDivElement>(null)
  const imgRef            = useRef<HTMLImageElement>(null)

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const r = containerRef.current.getBoundingClientRect()
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  // Lens background-position: show the zoomed portion of the image
  // The img uses object-contain with p-4 (16px), so rendered area ≠ container
  const lens = pos ? (() => {
    const cw = containerRef.current?.clientWidth  ?? 1
    const ch = containerRef.current?.clientHeight ?? 1
    const pad = 16
    // Rendered image area within container (object-contain)
    const ir = Math.min((cw - pad*2) / imgSize.w, (ch - pad*2) / imgSize.h)
    const iw = imgSize.w * ir
    const ih = imgSize.h * ir
    const ix = (cw - iw) / 2  // image left offset
    const iy = (ch - ih) / 2  // image top offset
    // Position within image (0-1)
    const px = (pos.x - ix) / iw
    const py = (pos.y - iy) / ih
    // Background size = ZOOM × container
    const bgW = iw * ZOOM
    const bgH = ih * ZOOM
    const bgX = -(px * bgW - LENS / 2)
    const bgY = -(py * bgH - LENS / 2)
    return { bgW, bgH, bgX, bgY, inside: px >= 0 && px <= 1 && py >= 0 && py <= 1 }
  })() : null

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair"
      onMouseMove={onMove}
      onMouseLeave={() => setPos(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={url}
        alt={alt}
        className="w-full h-full object-contain p-4 select-none"
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget
          setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
        }}
      />

      {/* Loupe lens */}
      {pos && lens?.inside && (
        <div
          style={{
            position: 'absolute',
            left:  Math.min(Math.max(pos.x - LENS/2, 0), (containerRef.current?.clientWidth  ?? 0) - LENS),
            top:   Math.min(Math.max(pos.y - LENS/2, 0), (containerRef.current?.clientHeight ?? 0) - LENS),
            width:  LENS,
            height: LENS,
            borderRadius: '50%',
            border: '2px solid #B8975A',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            overflow: 'hidden',
            backgroundImage: `url(${url})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${lens.bgW}px ${lens.bgH}px`,
            backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
          }}
        />
      )}

      {!pos && (
        <span className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm
                         rounded-full p-1.5 shadow text-stone-400 pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607zM10.5 7.5v6m3-3h-6"/>
          </svg>
        </span>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = { product: Product; siblings: Product[] }

export default function ProductDetail({ product, siblings }: Props) {
  const t  = useTranslations('product')
  const tn = useTranslations('nav')
  const locale = useLocale() as Locale
  const { hasCompany, isLoggedIn } = useAuth()
  const user = isLoggedIn
  const { ids, toggle }     = useWishlist()

  const allVariants = useMemo(() => [product, ...siblings], [product, siblings])
  const closures    = useMemo(
    () => [...new Set(allVariants.map((p) => p.closure))].sort(),
    [allVariants],
  )

  // Group constructions sharing the same set of widths
  const groupedConstructions = useMemo(() => {
    if (!product.constructions?.length) return []
    const groups = new Map<string, { names: string[]; widths: string[] }>()
    for (const c of product.constructions) {
      const key = [...c.widths].sort().join('|')
      const g = groups.get(key)
      if (g) g.names.push(c.construction)
      else groups.set(key, { names: [c.construction], widths: c.widths })
    }
    return [...groups.values()]
  }, [product.constructions])

  const [activeClosure, setActiveClosure] = useState<string>(product.closure)
  const [selected, setSelected]           = useState<Product>(product)
  const [activeImg, setActiveImg]         = useState(0)
  const [failed, setFailed]               = useState<Set<number>>(new Set())
  const [playing, setPlaying]             = useState(false)
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Helper to get translated color name
  const getColorName = useCallback((p: Product) => {
    return locale !== 'en' && p.color_name_i18n?.[locale]
      ? p.color_name_i18n[locale]
      : p.color_name
  }, [locale])

  const colourGrid = useMemo(
    () => allVariants.filter((p) => p.closure === activeClosure),
    [allVariants, activeClosure],
  )

  // Support two naming conventions:
  //   .png (new): 1700.0393.01.png → gallery: 1700.0393.02.png, .03.png …
  //   .jpg (old): 1700.0393.01.jpg → gallery: 1700.0393.01_02.jpg, _03.jpg …
  const allImages = useMemo(() => {
    const p = selected.picture_name
    if (!p) return []
    const isPng = /\.png$/i.test(p)
    if (isPng) {
      const base = p.replace(/\.\d{2}\.png$/i, '')
      const ext  = p.match(/\.(\d{2}\.png)$/i)?.[1] ?? '01.png'
      const num  = parseInt(ext)
      return [p, ...[2,3,4,5,6,7,8].map(n => `${base}.${String(n).padStart(2,'0')}.png`)]
    } else {
      const base = p.replace(/\.jpg$/i, '')
      return [p, ...[2,3,4,5,6,7,8].map(n => `${base}_${String(n).padStart(2,'0')}.jpg`)]
    }
  }, [selected])

  const validImages = allImages.filter((_, i) => !failed.has(i))

  // ── Auto-rotate (play) ─────────────────────────────────────────────────────
  function startPlay() {
    setPlaying(true)
    let i = 0
    playRef.current = setInterval(() => {
      i = (i + 1) % validImages.length
      setActiveImg(allImages.indexOf(validImages[i]))
    }, 700)
  }
  function stopPlay() {
    setPlaying(false)
    if (playRef.current) clearInterval(playRef.current)
  }
  // Stop when images change (new variant selected)
  useEffect(() => { stopPlay() }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Preload filter translations on mount
  useEffect(() => {
    preloadFilterTranslations()
  }, [])

  function selectClosure(cl: string) {
    setActiveClosure(cl)
    const first = allVariants.find((p) => p.closure === cl)
    if (first) { setSelected(first); setActiveImg(0); setFailed(new Set()) }
  }
  function selectVariant(p: Product) {
    setSelected(p); setActiveClosure(p.closure)
    setActiveImg(0); setFailed(new Set())
  }

  const wishlisted = ids.has(selected.id)
  const currentUrl = allImages[activeImg] && !failed.has(activeImg)
    ? src(allImages[activeImg]) : null

  const orderBtn = !user ? (
    <Link href="/login"
      className="inline-flex items-center px-8 py-3 rounded-xl border-2 border-gold
                 text-gold font-semibold text-sm hover:bg-gold hover:text-white transition-all">
      {t('order')}
    </Link>
  ) : !hasCompany ? (
    <div className="inline-flex items-center gap-2 px-8 py-3 rounded-xl
                    bg-stone-100 text-stone-400 font-medium text-sm">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
      </svg>
      {t('pending_approval')}
    </div>
  ) : (
    <Link href={`/gallery/${selected.id}/order`}
      className="inline-flex items-center px-8 py-3 rounded-xl bg-gold text-white
                 font-semibold text-sm hover:bg-gold-dark transition-colors uppercase tracking-wide">
      {t('order')}
    </Link>
  )

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <Link href="/gallery"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800
                   border border-stone-200 hover:border-stone-300 px-4 py-2 rounded-lg transition-colors">
        ← {tn('gallery')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-14">

        {/* ── LEFT: model header + photo + thumbnails + ORDER ─────── */}
        <div className="space-y-4">
          {/* Model / version — large */}
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-wide leading-tight">
              {selected.colour_id}
            </h1>
            <p className="text-stone-500 mt-1">{getColorName(selected)}</p>
          </div>

          {/* Badges + wishlist */}
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full border border-stone-200 shrink-0 shadow-sm"
              style={{ background: selected.color_basic || '#ccc' }} />
            {isNew(selected) && (
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase
                               bg-gold text-white rounded">NEW</span>
            )}
            {selected.diabetics && (
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase
                               bg-stone-700 text-white rounded-full">{t('diabetic')}</span>
            )}
            <button onClick={() => toggle(selected.id)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0
                          transition-all ${wishlisted
                            ? 'bg-gold/10 border-gold text-gold'
                            : 'border-stone-200 text-stone-400 hover:border-gold hover:text-gold'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24"
                fill={wishlisted ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth={wishlisted ? 0 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
              </svg>
            </button>
          </div>

          {/* Main image */}
          <div className="relative aspect-square"
            style={{ filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.13)) drop-shadow(0 3px 8px rgba(0,0,0,0.07))' }}>
            {currentUrl ? (
              <ZoomImage url={currentUrl} alt={`${product.style_name} ${getColorName(selected)}`} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-light text-stone-200 tracking-widest">{product.style_name}</span>
              </div>
            )}
          </div>

          {/* Thumbnails + play */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={playing ? stopPlay : startPlay}
                className={`shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center
                            transition-all ${playing
                              ? 'border-gold bg-gold/10 text-gold'
                              : 'border-stone-200 text-stone-400 hover:border-gold hover:text-gold'}`}>
                {playing ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
                {allImages.map((name, i) => failed.has(i) ? null : (
                  <button key={i}
                    onMouseEnter={() => { stopPlay(); setActiveImg(i) }}
                    onClick={() => setActiveImg(i)}
                    className={`relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-stone-50
                                border-2 transition-all
                                ${i === activeImg ? 'border-gold' : 'border-stone-100 hover:border-stone-300'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src(name)} alt="" className="w-full h-full object-contain p-1"
                      onError={() => setFailed((p) => new Set([...p, i]))} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ORDER button */}
          <div className="pt-2">{orderBtn}</div>
        </div>

        {/* ── RIGHT: info + constructions + available colours ──────── */}
        <div className="space-y-6">

          {/* Info + Sizes */}
          <div className="border border-stone-100 rounded-xl overflow-hidden text-sm">
            <div className="grid grid-cols-2 bg-stone-50 px-4 py-2 text-xs font-semibold
                            text-stone-500 uppercase tracking-wider">
              <span>{t('info')}</span><span>{t('sizes')}</span>
            </div>
            <div className="grid grid-cols-2 px-4 py-3 text-stone-800">
              <span className="text-stone-500">{product.info ?? '—'}</span>
              <span>EU {selected.size_first}–{selected.size_last}</span>
            </div>
          </div>

          {/* Constructions grouped by shared widths */}
          {groupedConstructions.length > 0 && (
            <div className="border border-stone-100 rounded-xl overflow-hidden text-sm">
              <div className="grid grid-cols-2 bg-stone-50 px-4 py-2 text-xs font-semibold
                              text-stone-500 uppercase tracking-wider">
                <span>{t('constructions').split('&')[0].trim()}</span>
                <span>{t('widths')}</span>
              </div>
              {groupedConstructions.map((g, i) => (
                <div key={i}
                  className={`grid grid-cols-2 px-4 py-2.5 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                  <span className="font-medium text-stone-700 leading-snug">
                    {g.names.join(', ')}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {g.widths.map((w) => (
                      <span key={w} className="px-1.5 py-0.5 text-xs bg-stone-100 rounded font-mono text-stone-700">{w}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Available colours — closure chips (if multiple) + colour grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              {t('colours')}
            </h2>
            {closures.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {closures.map((cl) => (
                  <button key={cl} onClick={() => selectClosure(cl)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all
                                ${cl === activeClosure
                                  ? 'bg-gold text-white border-gold shadow-sm'
                                  : 'border-stone-200 text-stone-600 hover:border-gold/60 hover:text-gold'}`}>
                    {translateFilterValueSync(cl, locale)}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {colourGrid.map((p) => (
                <button key={p.id} onClick={() => selectVariant(p)} className="text-left">
                  <ColourCard product={p} isSelected={p.id === selected.id} />
                </button>
              ))}
            </div>
          </div>

          {product.info && (
            <p className="text-sm text-stone-500 italic">{product.info}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ColourCard ────────────────────────────────────────────────────────────────
function ColourCard({ product, isSelected }: { product: Product; isSelected: boolean }) {
  const [failed, setFailed] = useState(false)
  const locale = useLocale() as Locale
  const colorName = locale !== 'en' && product.color_name_i18n?.[locale]
    ? product.color_name_i18n[locale]
    : product.color_name
  return (
    <div className={`rounded-xl overflow-hidden border-2 transition-all bg-stone-50
                     ${isSelected ? 'border-gold shadow-sm' : 'border-transparent hover:border-stone-200'}`}>
      <div className="relative aspect-square">
        {product.picture_name && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${BUCKET}/${product.picture_name}`} alt={colorName ?? ''}
            className="w-full h-full object-contain p-2"
            onError={() => setFailed(true)} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-8 h-8 rounded-full border border-stone-200"
              style={{ background: product.color_basic || '#ccc' }} />
          </div>
        )}
      </div>
      <div className="px-2 pb-2 pt-1">
        <p className="text-[10px] font-semibold text-stone-600 truncate">{product.colour_id}</p>
        <p className="text-[10px] text-stone-400 truncate">{colorName}</p>
      </div>
    </div>
  )
}
