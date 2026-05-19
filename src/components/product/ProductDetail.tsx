'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { isNew } from '@/components/gallery/GalleryPage'
import type { Product } from '@/types'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`
const src = (name: string) => `${BUCKET}/${name}`

// ── Zoom image (hover magnifier, no click needed) ─────────────────────────────
function ZoomImage({ url, alt }: { url: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const ref = useRef<HTMLDivElement>(null)

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = Math.round(((e.clientX - r.left) / r.width) * 100)
    const y = Math.round(((e.clientY - r.top) / r.height) * 100)
    setOrigin(`${x}% ${y}%`)
  }, [])

  return (
    <div
      ref={ref}
      className="relative w-full h-full overflow-hidden cursor-crosshair"
      onMouseEnter={() => setZoomed(true)}
      onMouseLeave={() => setZoomed(false)}
      onMouseMove={onMove}
    >
      {/* Raw <img> — full original quality, no next/image downsampling */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="w-full h-full object-contain p-4 select-none"
        style={{
          transform: zoomed ? 'scale(2.8)' : 'scale(1)',
          transformOrigin: origin,
          transition: zoomed ? 'transform-origin 0s' : 'transform 0.25s ease',
          willChange: 'transform',
        }}
        draggable={false}
      />
      {!zoomed && (
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
  const { hasCompany, user } = useAuth()
  const { ids, toggle }     = useWishlist()

  const allVariants = useMemo(() => [product, ...siblings], [product, siblings])
  const closures    = useMemo(
    () => [...new Set(allVariants.map((p) => p.closure))].sort(),
    [allVariants],
  )

  const [activeClosure, setActiveClosure] = useState(product.closure)
  const [selected, setSelected]           = useState<Product>(product)
  const [activeImg, setActiveImg]         = useState(0)
  const [failed, setFailed]               = useState<Set<number>>(new Set())
  const [playing, setPlaying]             = useState(false)
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const colourGrid = useMemo(
    () => allVariants.filter((p) => p.closure === activeClosure),
    [allVariants, activeClosure],
  )

  const base = selected.picture_name?.replace(/\.jpg$/i, '') ?? ''
  const allImages = useMemo(() => [
    selected.picture_name,
    ...[2,3,4,5,6,7,8].map((n) => `${base}_${String(n).padStart(2,'0')}.jpg`),
  ].filter(Boolean) as string[], [selected, base])

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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <Link href="/gallery"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800
                   border border-stone-200 hover:border-stone-300 px-4 py-2 rounded-lg
                   transition-colors">
        ← {tn('gallery')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16">

        {/* ── LEFT ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Style info */}
          <div className="border border-stone-100 rounded-xl overflow-hidden text-sm">
            <div className="grid grid-cols-3 bg-stone-50 px-4 py-2 text-xs font-semibold
                            text-stone-500 uppercase tracking-wider">
              <span>Style</span><span>Info</span><span>Sizes</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 text-stone-800">
              <span className="font-semibold">{product.style_name}</span>
              <span className="text-stone-500">{product.info ?? '—'}</span>
              <span>{selected.size_first}–{selected.size_last}</span>
            </div>
          </div>

          {/* Constructions */}
          {product.constructions?.length > 0 && (
            <div className="border border-stone-100 rounded-xl overflow-hidden text-sm">
              <div className="grid grid-cols-2 bg-stone-50 px-4 py-2 text-xs font-semibold
                              text-stone-500 uppercase tracking-wider">
                <span>Construction</span><span>Widths</span>
              </div>
              {product.constructions.map((c, i) => (
                <div key={i}
                  className={`grid grid-cols-2 px-4 py-2.5 gap-4 ${i%2===0?'bg-white':'bg-stone-50/50'}`}>
                  <span className="font-medium text-stone-700">{c.construction}</span>
                  <span className="flex flex-wrap gap-1">
                    {c.widths.map((w) => (
                      <span key={w} className="px-1.5 py-0.5 text-xs bg-stone-100 rounded font-mono text-stone-700">{w}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Colour strip + wishlist */}
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full border-2 border-stone-200 shrink-0 shadow-sm"
              style={{ background: selected.color_basic || '#ccc' }} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800 text-sm">{selected.colour_id}</p>
              <p className="text-stone-500 text-xs truncate">{selected.color_name}</p>
            </div>
            {isNew(selected) && (
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase
                               bg-gold text-white rounded">NEW</span>
            )}
            {selected.diabetics && (
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase
                               bg-stone-700 text-white rounded-full">{t('diabetic')}</span>
            )}
            <button onClick={() => toggle(selected.id)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0
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

          {/* Main image with zoom */}
          <div className="relative aspect-square bg-stone-50 rounded-[14px] overflow-hidden"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            {currentUrl ? (
              <ZoomImage url={currentUrl} alt={`${product.style_name} ${selected.color_name}`} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-light text-stone-200 tracking-widest">{product.style_name}</span>
              </div>
            )}
          </div>

          {/* Thumbnails + play button */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2">
              {/* Play/Stop */}
              <button
                onClick={playing ? stopPlay : startPlay}
                className={`shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center
                            transition-all ${playing
                              ? 'border-gold bg-gold/10 text-gold'
                              : 'border-stone-200 text-stone-400 hover:border-gold hover:text-gold'}`}
                title={playing ? 'Stop' : 'Auto-rotate'}>
                {playing ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              {/* Thumbnails — hover switches image, click locks */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
                {allImages.map((name, i) => failed.has(i) ? null : (
                  <button key={i}
                    onMouseEnter={() => { stopPlay(); setActiveImg(i) }}
                    onClick={() => setActiveImg(i)}
                    className={`relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-stone-50
                                border-2 transition-all
                                ${i === activeImg
                                  ? 'border-gold' : 'border-stone-100 hover:border-stone-300'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src(name)} alt="" className="w-full h-full object-contain p-1"
                      onError={() => setFailed((p) => new Set([...p, i]))} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT ────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Closure tabs */}
          {closures.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Closure</p>
              <div className="flex gap-2 flex-wrap">
                {closures.map((cl) => (
                  <button key={cl} onClick={() => selectClosure(cl)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold border transition-all
                                ${cl === activeClosure
                                  ? 'bg-gold text-white border-gold shadow-sm'
                                  : 'border-stone-200 text-stone-600 hover:border-gold/60 hover:text-gold'}`}>
                    {cl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colour grid */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              {t('colours')} — {activeClosure}
            </h2>
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

      {/* ORDER button */}
      <div className="border-t border-stone-100 pt-6">
        {!user ? (
          <Link href="/login"
            className="inline-flex items-center px-8 py-3 rounded-xl border-2 border-gold
                       text-gold font-semibold text-sm hover:bg-gold hover:text-white
                       transition-all">
            {t('order')}
          </Link>
        ) : !hasCompany ? (
          <div className="inline-flex items-center gap-2 px-8 py-3 rounded-xl
                          bg-stone-100 text-stone-400 font-medium text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
            </svg>
            Conta pendente de aprovação
          </div>
        ) : (
          <button className="px-8 py-3 rounded-xl bg-gold text-white font-semibold text-sm
                             hover:bg-gold-dark transition-colors uppercase tracking-wide">
            {t('order')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── ColourCard ────────────────────────────────────────────────────────────────
function ColourCard({ product, isSelected }: { product: Product; isSelected: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`rounded-xl overflow-hidden border-2 transition-all bg-stone-50
                     ${isSelected ? 'border-gold shadow-sm' : 'border-transparent hover:border-stone-200'}`}>
      <div className="relative aspect-square">
        {product.picture_name && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${BUCKET}/${product.picture_name}`} alt={product.color_name ?? ''}
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
        <p className="text-[10px] text-stone-400 truncate">{product.color_name}</p>
      </div>
    </div>
  )
}
