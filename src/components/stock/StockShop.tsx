'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import type { Locale, StockProduct } from '@/types'
import { preloadFilterTranslations, translateFilterValueSync } from '@/lib/filter-translations'
import StockGrid from './StockGrid'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const IMG_VERSION = '2'
const imageUrl = (name: string) => `${SUPABASE_URL}/storage/v1/object/public/products/${name}?v=${IMG_VERSION}`

const SHADOW     = 'drop-shadow(0 8px 20px rgba(0,0,0,0.11)) drop-shadow(0 2px 5px rgba(0,0,0,0.06))'
const SHADOW_HOV = 'drop-shadow(0 16px 32px rgba(0,0,0,0.16)) drop-shadow(0 4px 8px rgba(0,0,0,0.08))'

type Company = { id: string; name: string; erp_code: string }
type Props = {
  products: StockProduct[]
  companies: Company[]
  userCompany: Company | null
  isAdmin: boolean
  isLoggedIn: boolean
  canOrder: boolean
}

/**
 * Public STOCK shop. Phase 1 mirrors the gallery (card grid, same shadows and
 * card anatomy) but a click selects the model instead of navigating; with at
 * least one model selected the Place order bar activates. Phase 2 (login +
 * eligibility required) is the existing size/qty grid limited to the selection.
 */
export default function StockShop({ products, companies, userCompany, isAdmin, isLoggedIn, canOrder }: Props) {
  const t = useTranslations('stock')
  const locale = useLocale() as Locale
  const router = useRouter()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [ordering, setOrdering] = useState(false)
  const [pending, setPending] = useState(false)
  const [, forceI18n] = useState(0)

  useEffect(() => { preloadFilterTranslations().then(() => forceI18n((n) => n + 1)) }, [])

  const selectedProducts = useMemo(
    () => products.filter((p) => selected.has(p.id)),
    [products, selected],
  )

  function toggle(id: string) {
    if (!isLoggedIn) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function placeOrder() {
    if (selected.size === 0 || !isLoggedIn) return
    if (!canOrder) { setPending(true); return }
    setOrdering(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Phase 2: sizes/quantities + customer fields for the selection ─────────
  if (ordering) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOrdering(false)}
          className="mt-6 text-sm font-medium text-stone-500 hover:text-stone-900"
        >
          ← {t('backToSelection')}
        </button>
        <StockGrid
          products={selectedProducts}
          companies={companies}
          userCompany={userCompany}
          isAdmin={isAdmin}
        />
      </div>
    )
  }

  // ── Phase 1: gallery-style selection grid ─────────────────────────────────
  return (
    <div className="pb-24">
      <p className="mt-1 text-sm text-stone-400">{isLoggedIn ? t('clickToSelect') : t('loginHint')}</p>

      {pending && (
        <div className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          {t('pending')}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <StockCard
            key={p.id}
            product={p}
            locale={locale}
            selected={selected.has(p.id)}
            selectable={isLoggedIn}
            onToggle={() => toggle(p.id)}
          />
        ))}
      </div>

      {/* Sticky order bar — anonymous users get an explicit login CTA instead
          of selectable state they would lose on the login redirect. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-sm">
        {!isLoggedIn ? (
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm text-stone-600">{t('loginHint')}</span>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-dark"
            >
              {t('loginCta')}
            </button>
          </div>
        ) : (
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm text-stone-600">
            {selected.size > 0 ? t('selectedCount', { count: selected.size }) : t('noneSelected')}
          </span>
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                {t('clear')}
              </button>
            )}
            <button
              type="button"
              onClick={placeOrder}
              disabled={selected.size === 0}
              className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-dark disabled:opacity-40"
            >
              {t('placeOrder')}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

function isNewProduct(p: StockProduct): boolean {
  return !!p.new_until && new Date(p.new_until) > new Date()
}

function StockCard({ product, locale, selected, selectable, onToggle }: {
  product: StockProduct
  locale: Locale
  selected: boolean
  selectable: boolean
  onToggle: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  const colorName = locale !== 'en' && product.color_name_i18n?.[locale]
    ? product.color_name_i18n[locale]
    : product.color_name

  const translatedType = translateFilterValueSync(product.type, locale)
  const translatedClosure = translateFilterValueSync(product.closure, locale)

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!selectable}
      aria-pressed={selected}
      data-product-id={product.id}
      className={`group relative flex flex-col rounded-2xl text-left transition-all ${selectable ? '' : 'cursor-default'}`}
      style={{
        outline: selected ? '2px solid #B8975A' : '1px solid rgba(30,27,24,0.09)',
        outlineOffset: '2px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative m-1 aspect-square transition-all duration-300"
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
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-stone-100">
            <span className="text-2xl font-light tracking-widest text-stone-300">{product.colour_id}</span>
          </div>
        )}

        {/* Selection badge — hidden for anonymous users (selection is disabled) */}
        {selectable && (
          <span
            className={`absolute top-1.5 right-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-all duration-200
              ${selected ? 'bg-gold text-white scale-110' : 'bg-white/85 text-stone-300 group-hover:text-gold group-hover:bg-white'}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </span>
        )}

        {isNewProduct(product) && (
          <span className="absolute top-2 left-2 z-10 rounded bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">NEW</span>
        )}
      </div>

      <div className="flex flex-col gap-0.5 px-2.5 py-2">
        <p className="text-xs font-semibold leading-tight tracking-wide text-stone-800">{product.colour_id}</p>
        {colorName && <p className="truncate text-[11px] text-stone-400">{colorName}</p>}
        {(translatedType || translatedClosure) && (
          <p className="truncate text-[10px] text-stone-400">
            {[translatedType, translatedClosure].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </button>
  )
}
