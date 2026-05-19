'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { isNew } from '@/components/gallery/GalleryPage'
import type { Product } from '@/types'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`
const img = (name: string) => `${BUCKET}/${name}`

type Props = { product: Product; siblings: Product[] }

export default function ProductDetail({ product, siblings }: Props) {
  const t  = useTranslations('product')
  const tn = useTranslations('nav')
  const { hasCompany, user } = useAuth()
  const { ids, toggle } = useWishlist()

  // All variants of this style (current + siblings)
  const allVariants = useMemo(() => [product, ...siblings], [product, siblings])

  // Available closure types for this style
  const closures = useMemo(
    () => [...new Set(allVariants.map((p) => p.closure))].sort(),
    [allVariants],
  )

  // Interactive state
  const [activeClosure, setActiveClosure] = useState<string>(product.closure)
  const [selected, setSelected]           = useState<Product>(product)
  const [activeImg, setActiveImg]         = useState(0)
  const [failed, setFailed]               = useState<Set<number>>(new Set())
  const [lightbox, setLightbox]           = useState(false)

  // Products shown in the colour grid (filtered by selected closure tab)
  const colourGrid = useMemo(
    () => allVariants.filter((p) => p.closure === activeClosure),
    [allVariants, activeClosure],
  )

  // Gallery images for the currently selected variant
  const base = selected.picture_name?.replace(/\.jpg$/i, '') ?? ''
  const galleryImages = [
    selected.picture_name,
    ...[2,3,4,5,6,7,8].map((n) => `${base}_${String(n).padStart(2,'0')}.jpg`),
  ].filter(Boolean) as string[]

  function selectClosure(closure: string) {
    setActiveClosure(closure)
    const first = allVariants.find((p) => p.closure === closure)
    if (first) { setSelected(first); setActiveImg(0); setFailed(new Set()) }
  }

  function selectVariant(p: Product) {
    setSelected(p)
    setActiveClosure(p.closure)
    setActiveImg(0)
    setFailed(new Set())
  }

  const markFailed = (i: number) => setFailed((prev) => new Set([...prev, i]))
  const wishlisted = ids.has(selected.id)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

      {/* Back */}
      <Link href="/gallery"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800
                   border border-stone-200 hover:border-stone-300 px-4 py-2 rounded-lg
                   transition-colors">
        ← {tn('gallery')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16">

        {/* ── LEFT ──────────────────────────────────────────────────── */}
        <div className="space-y-5">

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

          {/* Constructions & Widths */}
          {product.constructions?.length > 0 && (
            <div className="border border-stone-100 rounded-xl overflow-hidden text-sm">
              <div className="grid grid-cols-2 bg-stone-50 px-4 py-2 text-xs font-semibold
                              text-stone-500 uppercase tracking-wider">
                <span>Construction</span><span>Widths</span>
              </div>
              {product.constructions.map((c, i) => (
                <div key={i}
                  className={`grid grid-cols-2 px-4 py-2.5 gap-4
                              ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                  <span className="font-medium text-stone-700">{c.construction}</span>
                  <span className="flex flex-wrap gap-1">
                    {c.widths.map((w) => (
                      <span key={w}
                        className="px-1.5 py-0.5 text-xs bg-stone-100 rounded font-mono text-stone-700">
                        {w}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Active colour + wishlist */}
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
                               bg-stone-700 text-white rounded-full">
                {t('diabetic')}
              </span>
            )}
            <button
              onClick={() => toggle(selected.id)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0
                          transition-all ${wishlisted
                            ? 'bg-gold/10 border-gold text-gold'
                            : 'border-stone-200 text-stone-400 hover:border-gold hover:text-gold'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24"
                fill={wishlisted ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth={wishlisted ? 0 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
          </div>

          {/* Main image — click to open lightbox */}
          <div
            className="relative aspect-square bg-stone-50 rounded-[14px] overflow-hidden cursor-zoom-in"
            style={{ boxShadow: 'var(--shadow-card)' }}
            onClick={() => !failed.has(activeImg) && galleryImages[activeImg] && setLightbox(true)}
          >
            {!failed.has(activeImg) && galleryImages[activeImg] ? (
              <Image key={`${selected.id}-${activeImg}`}
                src={img(galleryImages[activeImg])}
                alt={`${product.style_name} ${selected.color_name}`}
                fill sizes="(max-width: 1024px) 100vw, 600px"
                className="object-contain p-4" priority quality={90}
                onError={() => markFailed(activeImg)} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-light text-stone-200 tracking-widest">
                  {product.style_name}
                </span>
              </div>
            )}
            {/* Zoom hint */}
            {!failed.has(activeImg) && galleryImages[activeImg] && (
              <span className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm
                               rounded-full p-1.5 shadow-sm text-stone-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607zM10.5 7.5v6m3-3h-6" />
                </svg>
              </span>
            )}
          </div>

          {/* Lightbox */}
          {lightbox && galleryImages[activeImg] && (
            <div
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setLightbox(false)}
            >
              <button
                className="absolute top-4 right-4 text-white/70 hover:text-white"
                onClick={() => setLightbox(false)}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="relative w-full max-w-3xl aspect-square"
                onClick={(e) => e.stopPropagation()}>
                <Image
                  src={img(galleryImages[activeImg])}
                  alt={`${product.style_name} ${selected.color_name}`}
                  fill sizes="90vw" quality={100}
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {galleryImages.map((name, i) => failed.has(i) ? null : (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-stone-50
                              border-2 transition-all
                              ${i === activeImg
                                ? 'border-gold' : 'border-stone-100 hover:border-stone-300'}`}>
                  <Image src={img(name)} alt="" fill sizes="56px"
                    className="object-contain p-1"
                    onError={() => markFailed(i)} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT ─────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Closure tabs */}
          {closures.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {closures.map((cl) => (
                <button key={cl} onClick={() => selectClosure(cl)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all
                              ${cl === activeClosure
                                ? 'bg-gold text-white border-gold shadow-sm'
                                : 'border-stone-200 text-stone-600 hover:border-gold/60 hover:text-gold'}`}>
                  {cl}
                </button>
              ))}
            </div>
          )}

          {/* Colour grid */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              {t('colours')} — {activeClosure}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {colourGrid.map((p) => (
                <button key={p.id} onClick={() => selectVariant(p)}
                  className={`group text-left space-y-1 rounded-xl overflow-hidden
                              transition-all ${p.id === selected.id ? 'ring-2 ring-gold' : ''}`}>
                  <ColourCard product={p} isSelected={p.id === selected.id} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ORDER button ────────────────────────────────────────────── */}
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
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
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

// ── Colour card (in grid) ─────────────────────────────────────────────────────

function ColourCard({ product, isSelected }: { product: Product; isSelected: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`rounded-xl overflow-hidden border-2 transition-all bg-stone-50
                     ${isSelected ? 'border-gold' : 'border-transparent hover:border-stone-200'}`}>
      <div className="relative aspect-square">
        {product.picture_name && !failed ? (
          <Image src={`${BUCKET}/${product.picture_name}`} alt={product.color_name ?? ''}
            fill sizes="120px" className="object-contain p-2"
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
