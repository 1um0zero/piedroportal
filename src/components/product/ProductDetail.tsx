'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import LoginModal from '@/components/auth/LoginModal'
import NvosNotice from '@/components/stock/NvosNotice'
import { isNew } from '@/components/gallery/GalleryPage'
import { translateFilterValueSync, translateClosureSync, preloadFilterTranslations } from '@/lib/filter-translations'
import { displayWidth, sortWidths } from '@/lib/width-display'
import { productImageUrl } from '@/lib/products/image-url'
import type { Product, Locale } from '@/types'

// All product image URLs go through productImageUrl so they carry the shared
// cache-busting version (re-processed images keep the same object name).
const src = (name: string) => productImageUrl(name)

const LENS = 160       // lens diameter px (hover loupe)
const LENS_ZOOM = 1.8  // hover loupe magnification
const ZOOM_STEPS = [2.5, 4]  // click-to-zoom levels (each click steps up)

// ── Image viewer: hover loupe + click-to-zoom with cursor pan (in-place) ───────
// Hover shows the classic loupe lens. Clicking the image magnifies it inside the
// same frame; moving the cursor then pans the shoe so the zone under the pointer
// is brought into view. Click again (or leave) to reset.
function ZoomImage({ url, alt, onError }: { url: string; alt: string; onError?: () => void }) {
  const [pos, setPos]         = useState<{ x: number; y: number } | null>(null)
  // level: 0 = normal, 1..N = ZOOM_STEPS index+1 · dir: click direction (+1 in, -1 out)
  const [zoom, setZoom]       = useState({ level: 0, dir: 1 })
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 })  // natural size
  const containerRef          = useRef<HTMLDivElement>(null)
  const originRef             = useRef({ x: 50, y: 50 })  // last pan anchor (%) — persists when cursor leaves
  const lastMoveRef           = useRef<{ x: number; y: number; t: number } | null>(null)

  const level  = zoom.level
  const zoomed = level > 0
  const scale  = zoomed ? ZOOM_STEPS[level - 1] : 1

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const r = containerRef.current.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const now = performance.now()
    const last = lastMoveRef.current
    lastMoveRef.current = { x, y, t: now }
    if (zoomed) {
      // First move after (re)entering: just establish the baseline so the pan
      // resumes from this point instead of jumping to it.
      if (!last) return
      // Ignore fast cursor flicks (e.g. darting to the edge to exit) so the
      // image doesn't lurch away — only deliberate, slow moves pan it.
      const speed = Math.hypot(x - last.x, y - last.y) / Math.max(now - last.t, 1)
      if (speed > 1.2) return  // px per ms
    }
    setPos({ x, y })
  }, [zoomed])

  // Each click steps the zoom level, bouncing at the ends: 0→1→2→1→0→…
  // Pure updater (no ref mutation) so React StrictMode's double-invoke is safe.
  const onCycle = useCallback(() => {
    const max = ZOOM_STEPS.length
    setZoom(({ level: l, dir }) => {
      let next = l + dir
      if (next >= max)      { next = max; dir = -1 }
      else if (next <= 0)   { next = 0;   dir = 1 }
      return { level: next, dir }
    })
  }, [])

  // Geometry of the rendered image (object-contain with p-4) and cursor fraction.
  const geo = pos ? (() => {
    const cw = containerRef.current?.clientWidth  ?? 1
    const ch = containerRef.current?.clientHeight ?? 1
    const pad = 16
    const ir = Math.min((cw - pad*2) / imgSize.w, (ch - pad*2) / imgSize.h)
    const iw = imgSize.w * ir
    const ih = imgSize.h * ir
    const ix = (cw - iw) / 2
    const iy = (ch - ih) / 2
    const px = (pos.x - ix) / iw   // 0-1 within image (may fall outside)
    const py = (pos.y - iy) / ih
    const inside = px >= 0 && px <= 1 && py >= 0 && py <= 1
    // Loupe background (zoomed slice centred on cursor)
    const bgW = iw * LENS_ZOOM
    const bgH = ih * LENS_ZOOM
    const bgX = -(px * bgW - LENS / 2)
    const bgY = -(py * bgH - LENS / 2)
    return { px, py, inside, bgW, bgH, bgX, bgY }
  })() : null

  // Clamp the pan anchor so we never scroll past the shoe's edges, and remember
  // the last position so the zoom stays put when the cursor leaves the frame.
  if (geo) {
    originRef.current = {
      x: Math.min(Math.max(geo.px, 0), 1) * 100,
      y: Math.min(Math.max(geo.py, 0), 1) * 100,
    }
  }
  const originX = originRef.current.x
  const originY = originRef.current.y

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
      onMouseMove={onMove}
      onMouseLeave={() => { setPos(null); lastMoveRef.current = null }}
      onClick={onCycle}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="w-full h-full object-contain p-4 select-none transition-transform duration-150 ease-out"
        draggable={false}
        style={{
          transform: `scale(${scale})`,
          // Anchor the scale to the cursor so the zone under the pointer pans to
          // the centre — moving the cursor drags the far side into view.
          transformOrigin: `${originX}% ${originY}%`,
        }}
        onLoad={(e) => {
          const img = e.currentTarget
          setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
        }}
        onError={onError}
      />

      {/* Hover loupe — only while not click-zoomed */}
      {!zoomed && pos && geo?.inside && (
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
            backgroundSize: `${geo.bgW}px ${geo.bgH}px`,
            backgroundPosition: `${geo.bgX}px ${geo.bgY}px`,
          }}
        />
      )}

      {!zoomed && !pos && (
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
  const ts = useTranslations('stock')
  const locale = useLocale() as Locale
  const { canOrder, isLoggedIn } = useAuth()
  const user = isLoggedIn
  const { ids, toggle }     = useWishlist()
  const [showLogin, setShowLogin] = useState(false)

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
      else groups.set(key, { names: [c.construction], widths: sortWidths(c.widths) })
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
    () => allVariants
      .filter((p) => p.closure === activeClosure)
      .sort((a, b) => (a.colour_id ?? '').localeCompare(b.colour_id ?? '')),
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
  useEffect(() => { stopPlay() }, [selected])

  // Preload filter translations on mount, then bump state so chips that read the
  // synchronous cache during render re-render with the translated values.
  const [, setI18nReady] = useState(0)
  useEffect(() => {
    preloadFilterTranslations().then(() => setI18nReady(n => n + 1))
  }, [])

  // Colour code shared across closures, e.g. "1700.0393" → "0393".
  const colourKey = (p: Product) => (p.colour_id ?? '').split('.').pop() ?? ''

  function selectClosure(cl: string) {
    setActiveClosure(cl)
    const inClosure = allVariants.filter((p) => p.closure === cl)
    // Keep the same colour when switching closure; fall back to first available.
    const wantKey = colourKey(selected)
    const next = inClosure.find((p) => colourKey(p) === wantKey) ?? inClosure[0]
    // Keep the same image index across models; setFailed reset lets the new
    // model's images re-evaluate (currentUrl falls back if that index is absent).
    if (next) { setSelected(next); setFailed(new Set()) }
  }
  function selectVariant(p: Product) {
    setSelected(p); setActiveClosure(p.closure)
    setFailed(new Set())
  }

  const wishlisted = ids.has(selected.id)
  // Show the active image if this model has it; otherwise fall back to the first
  // image that loaded, and to nothing at all if the model has no images.
  const displayIdx = allImages[activeImg] && !failed.has(activeImg)
    ? activeImg
    : allImages.findIndex((_, i) => !failed.has(i))
  const currentUrl = displayIdx >= 0 && allImages[displayIdx]
    ? src(allImages[displayIdx]) : null

  const orderBtn = !user ? (
    // Explicit "log in to order" — opens the floating login panel in place
    // instead of yanking the visitor to the homepage login.
    <button type="button" onClick={() => setShowLogin(true)}
      className="inline-flex items-center px-8 py-3 rounded-xl border-2 border-gold
                 text-gold font-semibold text-sm hover:bg-gold hover:text-white transition-all">
      {ts('loginCta')}
    </button>
  ) : !canOrder ? (
    <div className="inline-flex items-center gap-2 px-8 py-3 rounded-xl
                    bg-stone-100 text-stone-400 font-medium text-sm">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
      </svg>
      {t('pending_approval')}
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={`/gallery/${selected.id}/order`}
        className="inline-flex items-center px-8 py-3 rounded-xl bg-gold text-white
                   font-semibold text-sm hover:bg-gold-dark transition-colors uppercase tracking-wide">
        {t('order')}
      </Link>
      {/* CUSTOM (custom-made shoes) — beta entry; same permission as OSB ordering */}
      <Link href={`/gallery/${selected.id}/custom`}
        className="inline-flex items-center px-6 py-3 rounded-xl border border-gold text-gold
                   font-semibold text-sm hover:bg-gold/10 transition-colors uppercase tracking-wide">
        Custom-made
      </Link>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
      <Link href="/gallery"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800
                   border border-stone-200 hover:border-stone-300 px-4 py-2 rounded-lg transition-colors">
        ← {tn('back')}
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
              <span title={t('soft_legend')}
                className="inline-flex items-center gap-2 pl-2 pr-3 py-1 text-[11px] font-semibold
                           bg-[#eef5fb] text-[#3f6f94] ring-1 ring-[#cfe3f0] rounded-full">
                <span className="w-4 h-4 rounded-full bg-[#cfe3f0] ring-1 ring-[#a9cce4]" />
                {t('diabetic')}
              </span>
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

          {selected.diabetics && (
            <p className="text-xs text-stone-500 -mt-1.5">
              <span className="font-semibold text-[#3f6f94]">S</span> = {t('soft_legend')}
            </p>
          )}

          {/* Main image */}
          <div className="relative aspect-square"
            style={{ filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.13)) drop-shadow(0 3px 8px rgba(0,0,0,0.07))' }}>
            {currentUrl ? (
              <ZoomImage
                url={currentUrl}
                alt={`${product.style_name} ${getColorName(selected)}`}
                onError={() => { if (displayIdx >= 0) setFailed((p) => new Set([...p, displayIdx])) }}
              />
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

          {/* ORDER button — stock (EVO) models carry the NVOS approval notice below it */}
          <div className="pt-2 space-y-3">
            {orderBtn}
            {product.is_stock && <NvosNotice className="w-full" />}
          </div>
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
              <span>{product.info ?? '—'}</span>
              <span>{selected.size_unit ?? 'EU'} {selected.size_first}–{selected.size_last}</span>
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
                  <span className="text-stone-800 leading-snug">
                    {g.names.map((n) => translateFilterValueSync(n, locale)).join(', ')}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {g.widths.map((w) => (
                      <span key={w} className="px-1.5 py-0.5 text-xs bg-stone-100 rounded text-stone-800">{displayWidth(w, g.widths, locale)}</span>
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
                    {translateClosureSync(cl, locale)}
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
          <img src={src(product.picture_name)} alt={colorName ?? ''}
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
