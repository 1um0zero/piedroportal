'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import type { Product, Section } from '@/types'
import { useWishlist } from '@/contexts/WishlistContext'
import ProductCard from './ProductCard'
import GalleryFilters from './GalleryFilters'

const SECTIONS: Section[] = ['KIDS', 'MEN', 'WOMEN']
const SECTION_KEY: Record<Section, 'kids' | 'men' | 'women'> = {
  KIDS: 'kids', MEN: 'men', WOMEN: 'women',
}

// ── Filter state type ─────────────────────────────────────────────────────────
export type Filters = {
  closures: string[]
  types: string[]
  colours: string[]
  constructions: string[]
  widths: string[]
  sizes: number[]
  search: string
  onlyNew: boolean
  onlyWishlist: boolean
}

const EMPTY: Filters = {
  closures: [], types: [], colours: [],
  constructions: [], widths: [], sizes: [],
  search: '', onlyNew: false, onlyWishlist: false,
}

// ── Core filter fn (exclude one dimension for cascading options) ───────────────
export function applyFilters(
  products: Product[],
  f: Filters,
  exclude?: keyof Filters,
): Product[] {
  return products.filter((p) => {
    if (exclude !== 'closures'      && f.closures.length > 0 && !f.closures.includes(p.closure))           return false
    if (exclude !== 'types'         && f.types.length > 0   && !f.types.includes(p.type))                  return false
    if (exclude !== 'colours'       && f.colours.length > 0 && !f.colours.includes(p.color_basic))         return false
    if (exclude !== 'constructions' && f.constructions.length > 0
      && !p.constructions?.some((c) => f.constructions.includes(c.construction)))                          return false
    if (exclude !== 'widths'        && f.widths.length > 0
      && !p.constructions?.some((c) => c.widths?.some((w) => f.widths.includes(w))))                      return false
    if (exclude !== 'sizes'         && f.sizes.length > 0
      && !f.sizes.some((s) => s >= p.size_first && s <= p.size_last))                                     return false
    if (f.search && !p.style_name.toLowerCase().includes(f.search.toLowerCase()))                         return false
    if (exclude !== 'onlyNew'       && f.onlyNew && !isNew(p))                                            return false
    // onlyWishlist is applied in the component (needs access to wishlist ids context)
    return true
  })
}

// ── Available sizes helper ────────────────────────────────────────────────────
function availableSizes(products: Product[]): number[] {
  if (!products.length) return []
  const min = Math.min(...products.map((p) => p.size_first))
  const max = Math.max(...products.map((p) => p.size_last))
  const out: number[] = []
  for (let s = min; s <= max + 0.001; s += 0.5) {
    const r = Math.round(s * 2) / 2
    if (products.some((p) => r >= p.size_first && r <= p.size_last)) out.push(r)
  }
  return out
}

// ── Width sort (letter widths in order, then numerics) ────────────────────────
const WIDTH_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R']
function sortWidths(a: string, b: string): number {
  const ia = WIDTH_ORDER.indexOf(a)
  const ib = WIDTH_ORDER.indexOf(b)
  if (ia >= 0 && ib >= 0) return ia - ib
  if (ia >= 0) return -1
  if (ib >= 0) return 1
  return a.localeCompare(b)
}

// ── "NEW" helper ──────────────────────────────────────────────────────────────
// new_until = null  → new with no expiry (unlimited)
// new_until = date  → new until that date
// new_until absent  → not a new product (column not set)
export function isNew(p: Product): boolean {
  if (!p.new_until) return false                 // NULL = not a new product
  return new Date(p.new_until) > new Date()      // future date = still new
}

// ── Toggle helper for multi-select arrays ─────────────────────────────────────
function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

// ─────────────────────────────────────────────────────────────────────────────

type Props = { initialSection?: Section; initialProducts?: Product[] }

export default function GalleryPage({ initialSection = 'KIDS', initialProducts = [] }: Props) {
  const t = useTranslations('gallery')

  const FIELDS = [
    'id','style_name','colour_id','picture_name','section',
    'closure','type','color_basic','color_name',
    'size_first','size_last','diabetics','new_until','constructions',
  ].join(',')

  // ── Per-section cache — seed with server-rendered initial data ──
  const [cache, setCache] = useState<Partial<Record<Section, Product[]>>>(
    initialProducts.length ? { [initialSection]: initialProducts } : {}
  )
  const [loading, setLoading] = useState(!initialProducts.length)
  const [section, setSection] = useState<Section>(initialSection)
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const { ids: wishlistIds }  = useWishlist()

  const sectionProducts = cache[section] ?? []

  // ── Options for each dimension (apply all OTHER active filters) ──
  const forClosure      = useMemo(() => applyFilters(sectionProducts, filters, 'closures'),      [sectionProducts, filters])
  const forType         = useMemo(() => applyFilters(sectionProducts, filters, 'types'),         [sectionProducts, filters])
  const forColour       = useMemo(() => applyFilters(sectionProducts, filters, 'colours'),       [sectionProducts, filters])
  const forConstructions= useMemo(() => applyFilters(sectionProducts, filters, 'constructions'), [sectionProducts, filters])
  const forWidths       = useMemo(() => applyFilters(sectionProducts, filters, 'widths'),        [sectionProducts, filters])
  const forSizes        = useMemo(() => applyFilters(sectionProducts, filters, 'sizes'),         [sectionProducts, filters])

  // ── Derived option lists ──
  const optClosures      = useMemo(() => [...new Set(forClosure.map((p) => p.closure).filter(Boolean))].sort() as string[], [forClosure])
  const optTypes         = useMemo(() => [...new Set(forType.map((p) => p.type).filter(Boolean))].sort() as string[], [forType])
  const optColours       = useMemo(() => [...new Set(forColour.map((p) => p.color_basic).filter(Boolean))].sort(), [forColour])
  const optConstructions = useMemo(() => [...new Set(forConstructions.flatMap((p) => p.constructions?.map((c) => c.construction) ?? []))].sort(), [forConstructions])
  const optWidths        = useMemo(() => [...new Set(forWidths.flatMap((p) => p.constructions?.flatMap((c) => c.widths ?? []) ?? []))].sort(sortWidths), [forWidths])
  const optSizes         = useMemo(() => availableSizes(forSizes), [forSizes])

  // ── Final filtered list (wishlist filter applied here, needs context) ──
  const filtered = useMemo(() => {
    const base = applyFilters(sectionProducts, filters)
    if (filters.onlyWishlist) return base.filter((p) => wishlistIds.has(p.id))
    return base
  }, [sectionProducts, filters, wishlistIds])

  // ── Auto-clear values that are no longer available ──
  function autoClean<T>(key: keyof Filters, current: T[], avail: T[]) {
    const availSet = new Set(avail)
    const valid = current.filter((v) => availSet.has(v))
    if (valid.length !== current.length) setFilters((f) => ({ ...f, [key]: valid }))
  }
  useEffect(() => autoClean('closures',      filters.closures,      optClosures),      [optClosures])      // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => autoClean('types',         filters.types,         optTypes),         [optTypes])         // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => autoClean('colours',       filters.colours,       optColours),       [optColours])       // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => autoClean('constructions', filters.constructions, optConstructions), [optConstructions]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => autoClean('widths',        filters.widths,        optWidths),        [optWidths])        // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => autoClean('sizes',         filters.sizes,         optSizes),         [optSizes])         // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSection(s: Section): Promise<Product[]> {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const url  = `${base}/rest/v1/products?select=${encodeURIComponent(FIELDS)}&active=eq.true&section=eq.${s}&order=style_name`
    const res  = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) throw new Error(`Supabase ${res.status}`)
    return res.json()
  }

  async function switchSection(s: Section) {
    setSection(s)
    setFilters(EMPTY)
    if (cache[s]) return
    setLoading(true)
    try {
      const data = await fetchSection(s)
      setCache((prev) => ({ ...prev, [s]: data }))
    } catch (err) {
      console.error('[Gallery] fetch error:', s, err)
    } finally {
      setLoading(false)
    }
  }

  const hasFilters = filters.closures.length > 0 || filters.types.length > 0 || filters.colours.length > 0
    || filters.constructions.length > 0 || filters.widths.length > 0 || filters.sizes.length > 0
    || filters.search || filters.onlyNew || filters.onlyWishlist

  const wishlistCount = useMemo(
    () => sectionProducts.filter((p) => wishlistIds.has(p.id)).length,
    [sectionProducts, wishlistIds],
  )

  const hasNew = useMemo(() => sectionProducts.some(isNew), [sectionProducts])

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Section tabs */}
      <div className="flex items-end gap-0 border-b border-stone-200">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => switchSection(s)}
            className={`relative px-6 py-3 text-sm font-semibold tracking-wider uppercase
                        transition-colors duration-200
                        ${s === section ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
          >
            {t(SECTION_KEY[s])}
            {s === section && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <GalleryFilters
        filters={filters}
        setFilters={setFilters}
        wishlistCount={wishlistCount}
        optClosures={optClosures}
        optTypes={optTypes}
        optColours={optColours}
        optConstructions={optConstructions}
        optWidths={optWidths}
        optSizes={optSizes}
        hasNew={hasNew}
        hasFilters={!!hasFilters}
        onClear={() => setFilters(EMPTY)}
        resultCount={filtered.length}
      />

      {/* Grid */}
      {loading ? (
        <div className="py-24 text-center text-stone-400 text-sm">
          <div className="inline-block w-6 h-6 border-2 border-stone-200 border-t-gold
                          rounded-full animate-spin mb-3" />
          <p>A carregar...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-stone-400 text-sm">
          {t('results', { count: 0 })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
