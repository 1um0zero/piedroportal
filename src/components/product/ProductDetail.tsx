'use client'

import { useState } from 'react'
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
  const wishlisted = ids.has(product.id)

  // Gallery images: main + _02 … _08
  const base = product.picture_name?.replace(/\.jpg$/i, '') ?? ''
  const allImages = [
    product.picture_name,
    ...[2,3,4,5,6,7,8].map((n) => `${base}_${String(n).padStart(2,'0')}.jpg`),
  ].filter(Boolean) as string[]

  const [activeImg, setActiveImg]   = useState(0)
  const [failed, setFailed]         = useState<Set<number>>(new Set())
  const markFailed = (i: number)    => setFailed((p) => new Set([...p, i]))

  // Group siblings by closure
  const sameClosure    = siblings.filter((s) => s.closure === product.closure)
  const otherClosures  = siblings.reduce<Record<string, Product[]>>((acc, s) => {
    if (s.closure !== product.closure) {
      acc[s.closure] = [...(acc[s.closure] ?? []), s]
    }
    return acc
  }, {})

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Back button */}
      <Link href="/gallery"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800
                   transition-colors border border-stone-200 hover:border-stone-300
                   px-4 py-2 rounded-lg">
        ← {tn('gallery')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10">

        {/* ── LEFT COLUMN ───────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Style info table */}
          <div className="border border-stone-100 rounded-xl overflow-hidden text-sm">
            <div className="grid grid-cols-3 bg-stone-50 px-4 py-2 font-semibold text-stone-500
                            text-xs uppercase tracking-wider">
              <span>Style</span>
              <span>Info</span>
              <span>Sizes</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3 text-stone-800">
              <span className="font-semibold">{product.style_name}</span>
              <span className="text-stone-500">{product.info ?? '—'}</span>
              <span>{product.size_first}–{product.size_last}</span>
            </div>
          </div>

          {/* Constructions & Widths */}
          {product.constructions?.length > 0 && (
            <div className="border border-stone-100 rounded-xl overflow-hidden text-sm">
              <div className="grid grid-cols-2 bg-stone-50 px-4 py-2 font-semibold text-stone-500
                              text-xs uppercase tracking-wider">
                <span>{t('constructions').split('&')[0].trim()}</span>
                <span>Widths</span>
              </div>
              {product.constructions.map((c, i) => (
                <div key={i}
                  className={`grid grid-cols-2 px-4 py-2.5 gap-4 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                  <span className="font-medium text-stone-700">{c.construction}</span>
                  <span className="text-stone-500">
                    {c.widths.map((w, j) => (
                      <span key={w}>
                        {j > 0 && <span className="text-stone-300 mx-1">,</span>}
                        <span className="font-medium text-stone-700">{w}</span>
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Current colour + wishlist */}
          <div className="flex items-center gap-3">
            <span
              className="w-8 h-8 rounded-full border-2 border-stone-200 shrink-0 shadow-sm"
              style={{ background: product.color_basic || '#ccc' }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800 text-sm">{product.colour_id}</p>
              <p className="text-stone-500 text-xs truncate">{product.color_name}</p>
            </div>
            {isNew(product) && (
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase
                               bg-gold text-white rounded">NEW</span>
            )}
            {product.diabetics && (
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide
                               uppercase bg-stone-700 text-white rounded-full">
                {t('diabetic')}
              </span>
            )}
            <button
              onClick={() => toggle(product.id)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0
                          transition-all ${wishlisted
                            ? 'bg-gold/10 border-gold text-gold'
                            : 'border-stone-200 text-stone-400 hover:border-gold hover:text-gold'}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"
                fill={wishlisted ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth={wishlisted ? 0 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
          </div>

          {/* Main image */}
          <div className="relative aspect-square bg-stone-50 rounded-[14px] overflow-hidden"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            {!failed.has(activeImg) && allImages[activeImg] ? (
              <Image
                key={allImages[activeImg]}
                src={img(allImages[activeImg])}
                alt={`${product.style_name} ${product.color_name}`}
                fill sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-contain p-6"
                priority
                onError={() => markFailed(activeImg)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-light text-stone-200 tracking-widest">
                  {product.style_name}
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((name, i) => failed.has(i) ? null : (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-stone-50
                              border-2 transition-all
                              ${i === activeImg ? 'border-gold' : 'border-stone-100 hover:border-stone-300'}`}>
                  <Image src={img(name)} alt="" fill sizes="56px"
                    className="object-contain p-1"
                    onError={() => markFailed(i)} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ──────────────────────────────────────────── */}
        <div className="space-y-8">

          {/* Same closure colour grid */}
          {sameClosure.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
                {t('colours')}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {sameClosure.map((s) => (
                  <ColourCard key={s.id} product={s} />
                ))}
              </div>
            </div>
          )}

          {/* Other closures */}
          {Object.entries(otherClosures).map(([closure, items]) => (
            <div key={closure} className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
                {t('also_available', { closure })}
              </h2>
              <div className="flex flex-wrap gap-2">
                {items.map((s) => (
                  <Link key={s.id} href={`/gallery/${s.id}`}
                    className="group relative w-16 h-16 rounded-xl overflow-hidden bg-stone-50
                               border-2 border-stone-100 hover:border-gold transition-all"
                    title={s.color_name}>
                    <ColourSwatch product={s} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ORDER button ───────────────────────────────────────────── */}
      <div className="border-t border-stone-100 pt-6">
        {!user ? (
          <Link href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-gold
                       text-gold font-semibold text-sm hover:bg-gold hover:text-white
                       transition-all duration-200">
            {t('order')}
          </Link>
        ) : !hasCompany ? (
          <div className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-stone-100
                          text-stone-400 font-medium text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
            Conta pendente de aprovação
          </div>
        ) : (
          <button className="px-8 py-3 rounded-xl bg-gold text-white font-semibold text-sm
                             hover:bg-gold-dark transition-colors duration-200 uppercase tracking-wide">
            {t('order')}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ColourCard({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false)
  return (
    <Link href={`/gallery/${product.id}`}
      className="group space-y-1">
      <div className="relative aspect-square bg-stone-50 rounded-xl overflow-hidden
                      border-2 border-transparent group-hover:border-gold transition-all">
        {product.picture_name && !failed ? (
          <Image src={`${BUCKET}/${product.picture_name}`} alt={product.color_name ?? ''}
            fill sizes="120px" className="object-contain p-2"
            onError={() => setFailed(true)} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="w-8 h-8 rounded-full border border-stone-200"
              style={{ background: product.color_basic || '#ccc' }}
            />
          </div>
        )}
      </div>
      <p className="text-[10px] font-semibold text-stone-600 truncate leading-tight">
        {product.colour_id}
      </p>
      <p className="text-[10px] text-stone-400 truncate leading-tight">
        {product.color_name}
      </p>
    </Link>
  )
}

function ColourSwatch({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false)
  if (product.picture_name && !failed) {
    return (
      <Image src={`${BUCKET}/${product.picture_name}`} alt={product.color_name ?? ''}
        fill sizes="64px" className="object-contain p-1"
        onError={() => setFailed(true)} />
    )
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="w-8 h-8 rounded-full border border-stone-200"
        style={{ background: product.color_basic || '#ccc' }} />
    </div>
  )
}
