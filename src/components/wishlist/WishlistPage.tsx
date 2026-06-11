'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useWishlist } from '@/contexts/WishlistContext'
import ProductCard from '@/components/gallery/ProductCard'
import type { Product, Section } from '@/types'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const FIELDS = 'id,style_name,colour_id,picture_name,section,closure,type,color_basic,color_name,size_first,size_last,diabetics,new_until,constructions'

const SECTION_ORDER: Section[] = ['KIDS', 'MEN', 'WOMEN']

export default function WishlistPage() {
  const t = useTranslations('nav')
  const tw = useTranslations('wishlist')
  const { ids, count } = useWishlist()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Use a stable string key so the effect only re-runs when IDs actually change
  const idKey = [...ids].sort().join(',')

  useEffect(() => {
    if (!idKey) { setProducts([]); setLoading(false); return }

    setLoading(true)
    // Use raw REST fetch (same pattern as gallery) — avoids SDK session hang
    const ids = idKey.split(',').map(id => `"${id}"`).join(',')
    fetch(`${BASE}/rest/v1/products?select=${FIELDS}&id=in.(${ids})&order=section,style_name`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    })
      .then(r => r.json())
      .then(data => { setProducts(Array.isArray(data) ? data as Product[] : []) })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [idKey])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="inline-block w-6 h-6 border-2 border-stone-200 border-t-gold
                        rounded-full animate-spin" />
      </div>
    )
  }

  if (count === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center space-y-4">
        <svg className="w-12 h-12 text-stone-300 mx-auto" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        <p className="text-stone-400">{tw('empty')}</p>
        <Link href="/gallery"
          className="inline-block mt-2 text-sm text-gold hover:underline">
          {t('gallery')} →
        </Link>
      </div>
    )
  }

  const bySection = SECTION_ORDER.map((section) => ({
    section,
    items: products.filter((p) => p.section === section),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        <h1 className="text-lg font-semibold text-stone-900">{t('wishlist')}</h1>
        <span className="text-sm text-stone-400">{tw('models', { count })}</span>
      </div>

      {bySection.map(({ section, items }) => (
        <div key={section} className="space-y-4">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-stone-400 border-b border-stone-100 pb-2">
            {section}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} showWishlist />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
