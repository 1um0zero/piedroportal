'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { Product, Section } from '@/types'
import { useWishlist } from '@/contexts/WishlistContext'
import { getMyExclusiveProducts } from '@/app/actions/catalogue'
import ProductCard from './ProductCard'
import GalleryFilters from './GalleryFilters'
import GalleryHero from './GalleryHero'
import { preloadFilterTranslations } from '@/lib/filter-translations'
import { decodeQuery } from '@/lib/query-cipher'
import { matchesSearch } from '@/lib/search'
import { useGallerySection } from '@/contexts/GallerySectionContext'
import { exclusiveTokens } from '@/lib/exclusive'
import { compareWidths } from '@/lib/width-display'

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
  onlyDiabetics: boolean
  category: number   // 0 = all; 1..10 = catalogue category
  styles: string[]   // exact style_name allow-list (curated collections); [] = all
}

const EMPTY: Filters = {
  closures: [], types: [], colours: [],
  constructions: [], widths: [], sizes: [],
  search: '', onlyNew: false, onlyWishlist: false, onlyDiabetics: false, category: 0,
  styles: [],
}

// Remembers the browse state (section + filters + scroll) so returning from a
// product page lands back where the user left off, not at the top of KIDS.
// Not sensitive (no patient data), so sessionStorage is fine.
const STATE_KEY = 'gallery-browse-state'

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
    if (exclude !== 'widths'        && f.widths.length > 0) {
      // Scope the width match to the selected construction(s): a width only
      // counts if it belongs to a construction the user is actually filtering on.
      const cons = (p.constructions ?? []).filter((c) => f.constructions.length === 0 || f.constructions.includes(c.construction))
      if (!cons.some((c) => c.widths?.some((w) => f.widths.includes(w))))                                  return false
    }
    if (exclude !== 'sizes'         && f.sizes.length > 0
      && !f.sizes.some((s) => s >= p.size_first && s <= p.size_last))                                     return false
    if (f.styles.length > 0 && !f.styles.includes((p.style_name ?? '').replace(/K$/i, '')))                return false
    if (f.search && !matchesSearch(p.style_name, f.search))                                                return false
    if (exclude !== 'category'      && f.category > 0 && p.category !== f.category)                        return false
    if (exclude !== 'onlyDiabetics' && f.onlyDiabetics && !p.diabetics)                                   return false
    if (exclude !== 'onlyNew'       && f.onlyNew && !isNew(p))                                            return false
    // onlyWishlist is applied in the component (needs access to wishlist ids context)
    return true
  })
}

// ── Available sizes helper ────────────────────────────────────────────────────
// Kids scales have whole sizes only (no half sizes) → pass wholeOnly.
function availableSizes(products: Product[], wholeOnly = false): number[] {
  if (!products.length) return []
  const min = Math.min(...products.map((p) => p.size_first))
  const max = Math.max(...products.map((p) => p.size_last))
  const step = wholeOnly ? 1 : 0.5
  const out: number[] = []
  for (let s = min; s <= max + 0.001; s += step) {
    const r = wholeOnly ? Math.round(s) : Math.round(s * 2) / 2
    if (products.some((p) => r >= p.size_first && r <= p.size_last)) out.push(r)
  }
  return out
}

// ── "NEW" helper ──────────────────────────────────────────────────────────────
// Editorial flag (products.is_new), curated in the back-office product list and
// seeded from the old portal's NewStyles list (scripts/seed-new-styles.mjs).
export function isNew(p: Product): boolean {
  return p.is_new === true
}


// ─────────────────────────────────────────────────────────────────────────────

type Props = { initialSection?: Section; initialProducts?: Product[]; showHero?: boolean }

export default function GalleryPage({ initialSection = 'KIDS', initialProducts = [], showHero = false }: Props) {
  const t = useTranslations('gallery')

  const FIELDS = [
    'id','style_name','colour_id','picture_name','section',
    'closure','type','color_basic','color_name',
    'size_first','size_last','size_unit','diabetics','is_new','category','constructions',
  ].join(',')
  const FIELDS_NO_UNIT = FIELDS.replace(',size_unit', '')

  // ── Per-section cache — seed with server-rendered initial data ──
  const [cache, setCache] = useState<Partial<Record<Section, Product[]>>>(
    initialProducts.length ? { [initialSection]: initialProducts } : {}
  )
  const [loading, setLoading] = useState(!initialProducts.length)
  const [section, setSection] = useState<Section>(initialSection)
  // In hero/preview mode the KIDS/MEN/WOMEN switch lives in the header; bridge it.
  const { section: ctxSection, setSection: setCtxSection, exclusive: ctxExclusive, setExclusive: setCtxExclusive } = useGallerySection()
  // Active exclusive-collection token (e.g. Livingstone/LIV). Only in hero mode.
  const exclusiveFilter = showHero ? ctxExclusive : ''
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const { ids: wishlistIds }  = useWishlist()

  // ── Customer-exclusive overlay ──
  // The cached public set never contains exclusive models. For the signed-in
  // user we fetch the exclusive products their companies own and overlay them.
  const [exclusives, setExclusives] = useState<Product[]>([])
  useEffect(() => {
    getMyExclusiveProducts().then(setExclusives).catch(() => {})
  }, [])

  // ── Restore browse state on mount (after returning from a product page) ──
  // Done in an effect (not in useState initialisers) to avoid an SSR/hydration
  // mismatch: the server always renders the default section.
  const pendingScroll = useRef<number | null>(null)
  const pendingAnchor = useRef<string | null>(null)   // id of the card to scroll back to
  const didRestore = useRef(false)
  useEffect(() => {
    if (didRestore.current) return
    didRestore.current = true

    // A deep link like /gallery?q=<token> (e.g. the landing OSB cards) wins over
    // any saved browse state — the user explicitly asked for that tab. The query
    // is opaque-encoded (see query-cipher); decode it client-side (also avoids a
    // useSearchParams Suspense deopt on this CDN-cached route).
    // Resolve the section to show: deep link (?q=) wins, else saved browse state.
    let resolved: Section = section
    const fetchIfNeeded = (s: Section) => {
      if (cache[s]) return
      setLoading(true)
      fetchSection(s)
        .then((data) => setCache((prev) => ({ ...prev, [s]: data })))
        .catch((err) => console.error('[Gallery] restore fetch error:', err))
        .finally(() => setLoading(false))
    }

    const q = new URLSearchParams(window.location.search).get('q')
    const dq = decodeQuery(q)
    const urlSection = (dq.section || '').toUpperCase() as Section
    if (SECTIONS.includes(urlSection)) {
      resolved = urlSection
      if (urlSection !== section) { setSection(urlSection); fetchIfNeeded(urlSection) }
      // Deep link may carry a catalogue category, search, diabetics flag and/or
      // an explicit style allow-list (curated collections, e.g. Ortho Soft).
      const cat = parseInt(dq.category || '0', 10)
      const diab = dq.diabetics === '1'
      const styles = (dq.styles || '').split(',').map((s) => s.trim()).filter(Boolean)
      if (cat > 0 || dq.search || diab || styles.length) setFilters((f) => ({
        ...f,
        category: cat > 0 ? cat : f.category,
        search: dq.search || f.search,
        onlyDiabetics: diab || f.onlyDiabetics,
        styles: styles.length ? styles : f.styles,
      }))
    } else {
      let saved: { section?: Section; filters?: Filters; scrollY?: number; anchorId?: string | null } | null = null
      try { saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null') } catch { /* ignore */ }
      if (saved) {
        if (saved.filters) setFilters({ ...EMPTY, ...saved.filters })
        if (typeof saved.scrollY === 'number') pendingScroll.current = saved.scrollY
        pendingAnchor.current = saved.anchorId ?? null
        const s = saved.section
        if (s && SECTIONS.includes(s)) {
          resolved = s
          if (s !== section) { setSection(s); fetchIfNeeded(s) }
        }
      }
    }

    // Exclusive collection deep link (e.g. Livingstone → ?q={exclusive:'LIV'}).
    // Adopt it (or clear a stale one) so a fresh /gallery entry resets it.
    const urlExclusive = (dq.exclusive || '').toUpperCase()

    // Adopt the resolved section as the header's baseline, then enable the
    // context→page bridge (so a stale persisted context can't override it).
    if (showHero) {
      setCtxSection(resolved)
      setCtxExclusive(urlExclusive)
    }
    headerReady.current = true
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sectionProducts = useMemo(() => {
    const base = cache[section] ?? []
    const extra = exclusives.filter((p) => p.section === section)
    const seen = new Set(base.map((p) => p.id))
    let merged = extra.length === 0 ? base : [...base, ...extra.filter((p) => !seen.has(p.id))]
    // Exclusive collection view (e.g. Livingstone): keep only products whose
    // `exclusive` field carries the token — a product can be LIV *and* others.
    if (exclusiveFilter) merged = merged.filter((p) => exclusiveTokens(p.exclusive).includes(exclusiveFilter))
    return merged
  }, [cache, section, exclusives, exclusiveFilter])

  // ── Options for each dimension (apply all OTHER active filters) ──
  const forClosure      = useMemo(() => applyFilters(sectionProducts, filters, 'closures'),      [sectionProducts, filters])
  const forType         = useMemo(() => applyFilters(sectionProducts, filters, 'types'),         [sectionProducts, filters])
  const forColour       = useMemo(() => applyFilters(sectionProducts, filters, 'colours'),       [sectionProducts, filters])
  // Constructions shown independently of size filter — selecting a size shouldn't hide the construction row
  const forConstructions= useMemo(() => applyFilters(sectionProducts, { ...filters, sizes: [] }, 'constructions'), [sectionProducts, filters])
  const forWidths       = useMemo(() => applyFilters(sectionProducts, filters, 'widths'),        [sectionProducts, filters])
  const forSizes        = useMemo(() => applyFilters(sectionProducts, filters, 'sizes'),         [sectionProducts, filters])

  // ── Derived option lists ──
  const optClosures      = useMemo(() => [...new Set(forClosure.map((p) => p.closure).filter(Boolean))].sort() as string[], [forClosure])
  const optTypes         = useMemo(() => [...new Set(forType.map((p) => p.type).filter(Boolean))].sort() as string[], [forType])
  const optColours       = useMemo(() => [...new Set(forColour.map((p) => p.color_basic).filter(Boolean))].sort(), [forColour])
  const optConstructions = useMemo(() => [...new Set(forConstructions.flatMap((p) => p.constructions?.map((c) => c.construction) ?? []))].sort(), [forConstructions])
  // Width options reflect the selected construction(s): if a construction is
  // filtered, only show widths belonging to it (each construction has its own
  // standard widths), otherwise show widths across all constructions.
  const optWidths        = useMemo(() => [...new Set(forWidths.flatMap((p) =>
      (p.constructions ?? [])
        .filter((c) => filters.constructions.length === 0 || filters.constructions.includes(c.construction))
        .flatMap((c) => c.widths ?? [])))]
    .filter(w => w && w !== '--' && w !== '-')
    .sort(compareWidths), [forWidths, filters.constructions])
  const optSizes         = useMemo(() => availableSizes(forSizes, section === 'KIDS'), [forSizes, section])
  // EU and UK scales are numerically different (UK 3–13.5, EU 15–48) — split the
  // size chips by unit so the filter never mixes them (size_unit, migration 015).
  const optSizesUK       = useMemo(() => availableSizes(forSizes.filter(p => p.size_unit === 'UK'), section === 'KIDS'), [forSizes, section])
  const optSizesEU       = useMemo(() => availableSizes(forSizes.filter(p => p.size_unit !== 'UK'), section === 'KIDS'), [forSizes, section])

  // ── Final filtered list (wishlist filter applied here, needs context) ──
  const filtered = useMemo(() => {
    const base = applyFilters(sectionProducts, filters)
    if (filters.onlyWishlist) return base.filter((p) => wishlistIds.has(p.id))
    return base
  }, [sectionProducts, filters, wishlistIds])

  // ── Persist browse state (section + filters) whenever it changes ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ section, filters, scrollY: window.scrollY }))
    } catch { /* ignore */ }
  }, [section, filters])

  // ── Persist browse state at the moment of leaving for a product page ──
  // Called from the ProductCard click (a client-side nav), so it runs while the
  // page is still scrolled where the user left it — far more reliable than a
  // scroll listener, which a fast click can outrun. `anchorId` lets us scroll
  // the exact card back into view on return (robust against layout/timing).
  const saveBrowse = (anchorId: string) => {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ section, filters, anchorId, scrollY: window.scrollY }))
    } catch { /* ignore */ }
  }

  // ── Restore position once the target section has rendered its cards ──
  // Prefer scrolling the clicked card into view (anchor); fall back to scrollY.
  useEffect(() => {
    if (loading || filtered.length === 0) return
    const anchor = pendingAnchor.current
    if (anchor) {
      let tries = 0
      const go = () => {
        const el = document.querySelector(`[data-product-id="${anchor}"]`)
        if (el) { el.scrollIntoView({ block: 'center' }); pendingAnchor.current = null; pendingScroll.current = null; return }
        if (tries++ < 10) requestAnimationFrame(go); else pendingAnchor.current = null
      }
      requestAnimationFrame(go)
      return
    }
    if (pendingScroll.current != null) {
      const y = pendingScroll.current
      pendingScroll.current = null
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
    }
  }, [loading, filtered.length])

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
    const headers = { apikey: key, Authorization: `Bearer ${key}` }
    const urlFor = (order: string, fields: string) =>
      `${base}/rest/v1/products?select=${encodeURIComponent(fields)}&active=eq.true&section=eq.${s}&or=(exclusive.is.null,exclusive.eq.)&order=${encodeURIComponent(order)}`
    // Prefer the manual gallery order; degrade gracefully if a migration isn't
    // applied yet — drop gallery_position order (014) and/or size_unit (015).
    let res = await fetch(urlFor('gallery_position.asc.nullslast,style_name.asc,colour_id.asc', FIELDS), { headers })
    if (!res.ok) res = await fetch(urlFor('style_name.asc,colour_id.asc', FIELDS), { headers })
    if (!res.ok) res = await fetch(urlFor('style_name.asc,colour_id.asc', FIELDS_NO_UNIT), { headers })
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

  // Bridge the header section switch (context) → this page, in hero mode only.
  // ONE direction: the header (context) drives the page. The page never writes
  // back via an effect (that two-way binding caused the button flicker). The
  // page's own initial section is adopted into the context once, in the restore
  // effect below, and `headerReady` keeps a stale persisted context from
  // overriding a fresh deep-link before that baseline is set.
  const headerReady = useRef(false)
  useEffect(() => {
    if (!showHero || !headerReady.current || ctxSection === section) return
    switchSection(ctxSection)
  }, [showHero, ctxSection]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = filters.closures.length > 0 || filters.types.length > 0 || filters.colours.length > 0
    || filters.constructions.length > 0 || filters.widths.length > 0 || filters.sizes.length > 0
    || filters.search || filters.onlyNew || filters.onlyWishlist || filters.onlyDiabetics || filters.category > 0
    || filters.styles.length > 0 || !!exclusiveFilter

  const [showWishlist, setShowWishlist] = useState(false)

  const wishlistCount = useMemo(
    () => sectionProducts.filter((p) => wishlistIds.has(p.id)).length,
    [sectionProducts, wishlistIds],
  )

  const hasNew = useMemo(() => sectionProducts.some(isNew), [sectionProducts])
  const hasDiabetics = useMemo(() => sectionProducts.some((p) => p.diabetics), [sectionProducts])

  // Preload filter translations on mount, then bump state so the filter chips
  // (which read the synchronous cache during render) re-render with the
  // translated values — otherwise they keep showing the raw English value.
  const [, setI18nReady] = useState(0)
  useEffect(() => {
    preloadFilterTranslations().then(() => setI18nReady(n => n + 1))
  }, [])

  return (
    <>
      {showHero && <GalleryHero section={section} />}
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Section tabs + search. In hero mode the section switch is in the header
          and the search is in the hero, so this whole row is hidden. */}
      {!showHero && (
      <div className="flex items-end justify-between border-b border-stone-200">
        <div className="flex items-end gap-0">
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
        {/* Search — top right, aligned with section tabs */}
        <div className="relative flex items-center pb-1.5">
          <svg className="absolute left-2.5 w-3.5 h-3.5 text-stone-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="search"
            value={filters.search}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder={t('filters.search')}
            title={t('filters.searchHint')}
            className="h-8 pl-8 pr-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                       text-stone-700 w-40 transition-all duration-200
                       hover:border-stone-300 focus:outline-none focus:ring-2
                       focus:ring-gold/30 focus:border-gold focus:w-52"
          />
        </div>
      </div>
      )}

      {/* Filters — sticky below the header (top-16) in hero mode so the toolbar
          stays put once the photo has scrolled away. */}
      <div className={showHero ? 'sticky top-16 z-20 -mx-6 px-6 py-3 bg-[var(--background)]' : ''}>
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
        optSizesEU={optSizesEU}
        optSizesUK={optSizesUK}
        hasNew={hasNew}
        hasDiabetics={hasDiabetics}
        hasFilters={!!hasFilters}
        onClear={() => { setFilters(EMPTY); setCtxExclusive('') }}
        resultCount={filtered.length}
        showWishlist={showWishlist}
        onToggleBuildWishlist={() => setShowWishlist(s => !s)}
      />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-24 text-center text-stone-400 text-sm">
          <div className="inline-block w-6 h-6 border-2 border-stone-200 border-t-gold
                          rounded-full animate-spin mb-3" />
          <p>{t('loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-stone-400 text-sm">
          {t('results', { count: 0 })}
        </div>
      ) : (
        <div id="catalogue" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 scroll-mt-20">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} showWishlist={showWishlist} onNavigate={() => saveBrowse(p.id)} />
          ))}
        </div>
      )}
    </div>
    </>
  )
}
