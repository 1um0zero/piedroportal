'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Product } from '@/types'
import { isNew } from './GalleryPage'
import { useWishlist } from '@/contexts/WishlistContext'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function imageUrl(name: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/products/${name}`
}

const SHADOW     = 'drop-shadow(0 10px 24px rgba(0,0,0,0.13)) drop-shadow(0 2px 6px rgba(0,0,0,0.07))'
const SHADOW_HOV = 'drop-shadow(0 18px 36px rgba(0,0,0,0.18)) drop-shadow(0 4px 10px rgba(0,0,0,0.09))'

type Props = { product: Product }

export default function ProductCard({ product }: Props) {
  const t = useTranslations('product')
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { ids, toggle } = useWishlist()
  const wishlisted = ids.has(product.id)

  return (
    <Link
      href={`/gallery/${product.id}`}
      className="group flex flex-col gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image — drop-shadow follows PNG transparency, no card */}
      <div
        className="relative aspect-square transition-all duration-300"
        style={{ filter: hovered ? SHADOW_HOV : SHADOW }}
      >
        {product.picture_name && !imgError ? (
          <Image
            src={imageUrl(product.picture_name)}
            alt={product.style_name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-contain p-3 transition-transform duration-500
                        ${hovered ? 'scale-[1.04]' : 'scale-100'}`}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center
                          bg-stone-100 rounded-2xl">
            <span className="text-3xl font-light text-stone-300 tracking-widest">
              {product.style_name}
            </span>
          </div>
        )}

        {/* Wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product.id) }}
          className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full
                      flex items-center justify-center transition-all duration-200
                      shadow-sm
                      ${wishlisted
                        ? 'bg-white text-gold scale-110'
                        : 'bg-white/80 text-stone-400 hover:text-gold hover:bg-white'}`}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24"
            fill={wishlisted ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth={wishlisted ? 0 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>

        {isNew(product) && (
          <span className="absolute top-3 left-3 z-10 px-2 py-0.5 text-[10px]
                           font-bold tracking-widest uppercase bg-gold text-white rounded shadow-sm">
            NEW
          </span>
        )}
        {product.diabetics && (
          <span className={`absolute z-10 px-2 py-0.5 text-[10px] font-semibold
                           tracking-widest uppercase bg-stone-700 text-white rounded-full shadow-sm
                           ${isNew(product) ? 'top-3 left-14' : 'top-3 left-3'}`}>
            {t('diabetic')}
          </span>
        )}
      </div>

      {/* Info — clean, no card */}
      <div className="px-1 flex flex-col gap-1">
        <h3 className="font-semibold text-stone-900 text-sm leading-tight tracking-wide">
          {product.style_name}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
          <span>{product.closure}</span>
          <span className="text-stone-300">·</span>
          <span>{product.type}</span>
        </div>
        <p className="text-[11px] text-stone-400">
          {t('sizes')}&nbsp;{product.size_first}–{product.size_last}
        </p>
        {product.color_name && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-3 h-3 rounded-full border border-stone-200 shrink-0"
              style={{ background: product.color_basic || '#ccc' }} />
            <span className="text-[11px] text-stone-500">{product.color_name}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
