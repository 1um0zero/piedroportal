'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useWishlist } from '@/contexts/WishlistContext'
import { isNew } from '@/components/gallery/GalleryPage'
import type { Product } from '@/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET = `${SUPABASE_URL}/storage/v1/object/public/products`

function img(name: string) { return `${BUCKET}/${name}` }

type Props = { product: Product; siblings: Product[] }

export default function ProductDetail({ product, siblings }: Props) {
  const t  = useTranslations('product')
  const tn = useTranslations('nav')
  const { hasCompany, user } = useAuth()
  const { ids, toggle } = useWishlist()
  const wishlisted = ids.has(product.id)

  // Build image list: main + gallery _02 … _08
  const base = product.picture_name?.replace(/\.jpg$/i, '') ?? ''
  const allImages = [
    product.picture_name,
    ...[2,3,4,5,6,7,8].map((n) => `${base}_${String(n).padStart(2,'0')}.jpg`),
  ].filter(Boolean) as string[]

  const [activeImg, setActiveImg]     = useState(0)
  const [failedImgs, setFailedImgs]   = useState<Set<number>>(new Set())

  const visibleImages = allImages.filter((_, i) => !failedImgs.has(i))

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-stone-400 mb-6 flex items-center gap-2">
        <Link href="/gallery" className="hover:text-stone-700 transition-colors">
          {tn('gallery')}
        </Link>
        <span>/</span>
        <span className="text-stone-600">{product.style_name} · {product.color_name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

        {/* ── Left: Image gallery ────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="relative aspect-square bg-stone-50 rounded-[14px] overflow-hidden"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            {product.picture_name && !failedImgs.has(activeImg) ? (
              <Image
                key={allImages[activeImg]}
                src={img(allImages[activeImg] ?? product.picture_name)}
                alt={`${product.style_name} ${product.color_name}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-6"
                priority
                onError={() => setFailedImgs((prev) => new Set([...prev, activeImg]))}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-light text-stone-200 tracking-widest">
                  {product.style_name}
                </span>
              </div>
            )}

            {/* NEW badge */}
            {isNew(product) && (
              <span className="absolute top-4 left-4 px-2.5 py-1 text-[11px] font-bold
                               tracking-widest uppercase bg-gold text-white rounded shadow">
                NEW
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {visibleImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((name, i) =>
                failedImgs.has(i) ? null : (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-stone-50
                                border-2 transition-all duration-150
                                ${i === activeImg ? 'border-gold' : 'border-transparent hover:border-stone-200'}`}
                  >
                    <Image
                      src={img(name)}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-contain p-1"
                      onError={() => setFailedImgs((prev) => new Set([...prev, i]))}
                    />
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* ── Right: Info ───────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-stone-900 tracking-wide">
                  {product.style_name}
                </h1>
                <p className="text-stone-500 mt-0.5">{product.color_name}</p>
              </div>
              {/* Wishlist */}
              <button
                onClick={() => toggle(product.id)}
                className={`w-10 h-10 rounded-full border flex items-center justify-center
                            transition-all duration-200 shrink-0
                            ${wishlisted
                              ? 'bg-gold/10 border-gold text-gold'
                              : 'border-stone-200 text-stone-400 hover:border-gold hover:text-gold'}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"
                  fill={wishlisted ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth={wishlisted ? 0 : 2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2.5 py-1 text-xs font-medium bg-stone-100 text-stone-600 rounded-full">
                {product.type}
              </span>
              <span className="px-2.5 py-1 text-xs font-medium bg-stone-100 text-stone-600 rounded-full">
                {product.closure}
              </span>
              {product.diabetics && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-stone-800 text-white rounded-full">
                  {t('diabetic')}
                </span>
              )}
            </div>
          </div>

          {/* Sizes */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              {t('sizes')}
            </p>
            <p className="text-stone-800 font-medium">
              {product.size_first} – {product.size_last}
            </p>
          </div>

          {/* Constructions & Widths */}
          {product.constructions?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                {t('constructions')}
              </p>
              <div className="border border-stone-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {product.constructions.map((c, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                        <td className="px-4 py-2.5 font-medium text-stone-700 w-40">
                          {c.construction}
                        </td>
                        <td className="px-4 py-2.5 text-stone-500">
                          <div className="flex flex-wrap gap-1.5">
                            {c.widths.map((w) => (
                              <span key={w}
                                className="px-2 py-0.5 text-xs bg-stone-100 rounded font-mono">
                                {w}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sibling colours */}
          {siblings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                {t('colours')}
              </p>
              <div className="flex flex-wrap gap-2">
                {siblings.map((s) => (
                  <Link
                    key={s.id}
                    href={`/gallery/${s.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border
                               border-stone-200 hover:border-gold transition-colors duration-150
                               text-xs text-stone-600 hover:text-gold"
                    title={s.closure}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-stone-300 shrink-0"
                      style={{ background: s.color_basic || '#ccc' }}
                    />
                    {s.color_name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          {product.info && (
            <p className="text-sm text-stone-500 italic">{product.info}</p>
          )}

          {/* Order button */}
          <div className="pt-2">
            {!user ? (
              <Link
                href="/login"
                className="block w-full text-center h-12 rounded-xl border-2 border-gold
                           text-gold font-semibold text-sm hover:bg-gold hover:text-white
                           transition-all duration-200 flex items-center justify-center"
              >
                {tn('login')} {t('order')}
              </Link>
            ) : !hasCompany ? (
              <div className="w-full h-12 rounded-xl bg-stone-100 text-stone-400 font-medium
                              text-sm flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                Conta pendente de aprovação
              </div>
            ) : (
              <button
                className="w-full h-12 rounded-xl bg-gold text-white font-semibold text-sm
                           hover:bg-gold-dark transition-colors duration-200"
              >
                {t('order')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
