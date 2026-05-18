'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Product } from '@/types'
import { isNew } from './GalleryPage'
import { useWishlist } from '@/contexts/WishlistContext'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function imageUrl(pictureName: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/products/${pictureName}`
}

type Props = { product: Product }

export default function ProductCard({ product }: Props) {
  const t = useTranslations('product')
  const [imgError, setImgError] = useState(false)
  const { ids, toggle } = useWishlist()
  const wishlisted = ids.has(product.id)

  return (
    <article
      className="group bg-white rounded-[14px] overflow-hidden flex flex-col cursor-pointer
                 transition-all duration-300 ease-out
                 hover:translate-y-[-2px]"
      style={{ boxShadow: 'var(--shadow-card)' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = '0 0 0 2px #B8975A, var(--shadow-card-hover)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.boxShadow = 'var(--shadow-card)'
      }}
    >
      {/* Image */}
      <div className="relative aspect-square bg-stone-50 overflow-hidden">
        {product.picture_name && !imgError ? (
          <Image
            src={imageUrl(product.picture_name)}
            alt={product.style_name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-light text-stone-300 tracking-widest">
              {product.style_name}
            </span>
          </div>
        )}
        {/* Wishlist heart */}
        <button
          onClick={(e) => { e.stopPropagation(); toggle(product.id) }}
          className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center
                      transition-all duration-200 shadow-sm
                      ${wishlisted
                        ? 'bg-white text-gold scale-110'
                        : 'bg-white/70 text-stone-400 hover:text-gold hover:bg-white'}`}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth={wishlisted ? 0 : 2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>

        {isNew(product) && (
          <span className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-bold
                           tracking-widest uppercase bg-gold text-white rounded shadow-sm">
            NEW
          </span>
        )}
        {product.diabetics && (
          <span className={`absolute px-2 py-0.5 text-[10px] font-semibold tracking-widest
                           uppercase bg-stone-700 text-white rounded-full shadow-sm
                           ${isNew(product) ? 'top-3 left-14' : 'top-3 left-3'}`}>
            {t('diabetic')}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-1.5">
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
            <span
              className="w-3 h-3 rounded-full border border-stone-200 shrink-0"
              style={{ background: product.color_basic || '#ccc' }}
            />
            <span className="text-[11px] text-stone-500">{product.color_name}</span>
          </div>
        )}
      </div>
    </article>
  )
}
