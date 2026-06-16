'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Product, Locale } from '@/types'
import { isNew } from './GalleryPage'
import { useWishlist } from '@/contexts/WishlistContext'
import { translateFilterValueSync, translateClosureSync } from '@/lib/filter-translations'
import { displayWidths } from '@/lib/width-display'
import { productImageUrl as imageUrl } from '@/lib/products/image-url'
import { clientSiglas } from '@/lib/exclusive'
import { siglaColor, CLIENT_DOT_COLOR } from '@/lib/exclusive-colors'

const SHADOW     = 'drop-shadow(0 8px 20px rgba(0,0,0,0.11)) drop-shadow(0 2px 5px rgba(0,0,0,0.06))'
const SHADOW_HOV = 'drop-shadow(0 16px 32px rgba(0,0,0,0.16)) drop-shadow(0 4px 8px rgba(0,0,0,0.08))'

type Props = {
  product: Product
  showWishlist?: boolean
  onNavigate?: () => void
  // Exclusive marker: 'client' → a single gold dot on the user's own exclusive
  // models; 'admin' → one pastel dot per collection (sigla); 'none' → no marker.
  exclusiveView?: 'none' | 'client' | 'admin'
}

export default function ProductCard({ product, showWishlist = false, onNavigate, exclusiveView = 'none' }: Props) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered]   = useState(false)
  const { ids, toggle }         = useWishlist()
  const locale = useLocale() as Locale
  const tp = useTranslations('product')
  const wishlisted = ids.has(product.id)

  // Get translated color name
  const colorName = locale !== 'en' && product.color_name_i18n?.[locale]
    ? product.color_name_i18n[locale]
    : product.color_name

  // Constructions summary for tooltip
  const constructions = product.constructions ?? []

  // Translate filter values for tooltip
  const translatedType = translateFilterValueSync(product.type, locale)
  const translatedClosure = translateClosureSync(product.closure, locale)

  // Customer-exclusivity dots (LIV is a section, never a dot). Clients get a
  // single gold dot on their own exclusive models; admin/branch get one pastel
  // dot per customer sigla.
  const siglas = exclusiveView === 'none'
    ? []
    : clientSiglas((product as Product & { exclusive?: string }).exclusive)
  const dots = exclusiveView === 'client'
    ? (siglas.length ? [{ key: 'client', color: CLIENT_DOT_COLOR, label: tp('exclusive') }] : [])
    : siglas.map((c) => ({ key: c, color: siglaColor(c), label: c }))

  return (
    <Link
      href={`/gallery/${product.id}`}
      data-product-id={product.id}
      className="group relative flex flex-col rounded-2xl"
      style={{ outline: '1px solid rgba(30,27,24,0.09)', outlineOffset: '2px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate?.()}
    >
      {/* Image — m-1 = tiny margin from outline, p-2 = maximise visible area */}
      <div
        className="relative aspect-square m-1 transition-all duration-300"
        style={{ filter: hovered ? SHADOW_HOV : SHADOW }}
      >
        {product.picture_name && !imgError ? (
          <Image
            src={imageUrl(product.picture_name)}
            alt={product.colour_id}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-contain p-2 transition-transform duration-500 ${hovered ? 'scale-[1.04]' : 'scale-100'}`}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100 rounded-xl">
            <span className="text-2xl font-light text-stone-300 tracking-widest">{product.colour_id}</span>
          </div>
        )}

        {showWishlist && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product.id) }}
            className={`absolute top-1.5 right-1.5 z-10 w-8 h-8 rounded-full
                        flex items-center justify-center transition-all duration-200 shadow-sm
                        ${wishlisted ? 'bg-gold text-white scale-110' : 'bg-white/85 text-stone-400 hover:text-gold hover:bg-white'}`}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={wishlisted ? 0 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        )}

        {dots.length > 0 && (
          <div className={`absolute right-2 z-10 flex items-center gap-1 ${showWishlist ? 'top-11' : 'top-2'}`}>
            {dots.map((d) => (
              <span key={d.key} title={d.label} aria-label={d.label}
                className="w-3 h-3 rounded-full ring-2 ring-white shadow-sm"
                style={{ backgroundColor: d.color }} />
            ))}
          </div>
        )}

        {isNew(product) && (
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase bg-gold text-white rounded shadow-sm">NEW</span>
        )}
        {product.diabetics && (
          <span title={tp('diabetic')} aria-label={tp('diabetic')}
            className={`absolute z-10 px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase bg-stone-700 text-white rounded-full shadow-sm ${isNew(product) ? 'top-2 left-14' : 'top-2 left-2'}`}>D</span>
        )}
      </div>

      {/* Ref + colour */}
      <div className="px-2.5 py-2 flex flex-col gap-0.5">
        <p className="font-semibold text-stone-800 text-xs tracking-wide leading-tight">{product.colour_id}</p>
        {colorName && (
          <p className="text-[11px] text-stone-400 truncate">{colorName}</p>
        )}
      </div>

      {/* Tooltip — appears below card on hover */}
      <div
        className="absolute top-full left-0 right-0 mt-1.5 z-50 pointer-events-none
                   transition-all duration-200"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-stone-100
                        shadow-xl shadow-stone-900/10 p-3 space-y-2">
          {/* Type · Closure */}
          <div className="flex items-center gap-2 flex-wrap">
            {translatedType && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-stone-100 text-stone-600 rounded">{translatedType}</span>
            )}
            {translatedClosure && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-stone-100 text-stone-600 rounded">{translatedClosure}</span>
            )}
          </div>

          {/* Constructions */}
          {constructions.length > 0 && (
            <div className="text-[10px] text-stone-500 space-y-0.5">
              {constructions.map((c, i) => (
                <div key={i} className="flex items-baseline gap-1.5">
                  <span className="font-medium text-stone-700 shrink-0">{translateFilterValueSync(c.construction, locale)}</span>
                  <span className="text-stone-400">{displayWidths(c.widths, locale).join(' · ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Sizes */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-stone-400">{product.size_unit ?? 'EU'}</span>
            <span className="text-[10px] font-semibold text-stone-700">
              {product.size_first} – {product.size_last}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
