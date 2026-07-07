'use client'

import { useState, useMemo, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { productImageUrl } from '@/lib/products/image-url'
import { matchesAny } from '@/lib/search'
import { GridFloatingNav, ListPager } from '@/components/ui/table-controls'
import { useListNav } from '@/components/ui/use-list-nav'

// Order unit → translation key in the `order` namespace.
const UNIT_KEYS: Record<string, string> = {
  PAIR: 'unit_pair', LEFT: 'unit_left', RIGHT: 'unit_right',
  LEFT_RIGHT: 'unit_lr', DIFF_SIZES: 'unit_sizes',
}

type DraftRow = {
  id: string
  user_id: string | null
  unit: string | null
  clinician: string | null
  patient_name: string | null
  reference_customer: string | null
  created_at: string | null
  updated_at: string | null
  owner_email?: string | null
  products?: { id?: string; style_name?: string; colour_id?: string; closure?: string; picture_name?: string } | null
  companies?: { name?: string; erp_code?: string } | null
}

/**
 * Read-only consultation list of DRAFT orders for the back-office. Drafts are
 * private to their creator (they may be tests/notes/scratch orders), so they are
 * deliberately kept OUT of the main Orders analysis. This page carries no
 * follow-up columns (production/delivery/PDF); the only action is "resume" on the
 * viewer's OWN drafts — colleagues' drafts stay pure consultation.
 * See memory project_draft_on_behalf_future.
 */
export default function DraftsList({ drafts, currentUserId }: { drafts: DraftRow[]; currentUserId?: string }) {
  const t  = useTranslations('admin.drafts')
  const to = useTranslations('admin.orders')
  const tu = useTranslations('order')
  const locale = useLocale()
  const [search, setSearch] = useState('')
  const { page, setPage } = useListNav('admin-drafts')
  const PER_PAGE = 50
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!search) return drafts
    return drafts.filter(o => matchesAny(
      [o.products?.style_name, o.products?.colour_id, o.patient_name, o.reference_customer, o.clinician, o.companies?.name, o.owner_email],
      search,
    ))
  }, [drafts, search])

  const currentYear = new Date().getFullYear()
  const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString(locale, d.getFullYear() < currentYear
      ? { day: '2-digit', month: 'short', year: 'numeric' }
      : { day: '2-digit', month: 'short' })
  }

  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-stone-900">{t('title')}</h1>
        <p className="text-sm text-stone-500">{t('subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex items-center">
          <svg className="absolute left-2.5 w-3.5 h-3.5 text-stone-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('search_placeholder')}
            className="h-9 pl-8 pr-3 text-sm bg-white border border-stone-200 rounded-lg w-64
                       focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all" />
        </div>
        <p className="ml-auto text-sm text-stone-400">{t('count', { count: filtered.length })}</p>
      </div>

      <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100">
              <tr className="text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <th className="px-2.5 py-3 text-left">{to('col_date')}</th>
                <th className="px-2.5 py-3 text-left">{to('col_product')}</th>
                <th className="px-2.5 py-3 text-left">{to('col_unit')}</th>
                <th className="px-2.5 py-3 text-left">{to('col_company')}</th>
                <th className="px-2.5 py-3 text-left">{to('col_clinician')}</th>
                <th className="px-2.5 py-3 text-left">{t('col_owner')}</th>
                <th className="px-2.5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-stone-400 text-sm">{t('empty')}</td></tr>
              ) : filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(o => {
                const product = o.products
                return (
                  <tr key={o.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-2.5 py-3 text-stone-500 text-xs whitespace-nowrap">{fmtDate(o.created_at)}</td>
                    <td className="px-2.5 py-3">
                      <div className="flex items-center gap-3">
                        {product?.picture_name ? (
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-stone-50 shrink-0">
                            <Image src={productImageUrl(product.picture_name)} alt={product.style_name ?? ''}
                              fill sizes="36px" className="object-contain p-0.5" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-stone-100 shrink-0 flex items-center justify-center text-xs text-stone-400">
                            {product?.style_name?.slice(0, 4) ?? '—'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-stone-800 truncate">{product?.colour_id ?? product?.style_name ?? '—'}</p>
                          <p className="text-xs text-stone-400 truncate">{product?.closure ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-stone-500 text-xs whitespace-nowrap">
                      {o.unit && UNIT_KEYS[o.unit] ? tu(UNIT_KEYS[o.unit]) : (o.unit ?? '—')}
                    </td>
                    <td className="px-2.5 py-3">
                      <p className="text-stone-700 text-sm truncate max-w-[150px]">{o.companies?.name ?? '—'}</p>
                      <p className="text-xs text-stone-400">{o.companies?.erp_code ?? ''}</p>
                    </td>
                    <td className="px-2.5 py-3">
                      <p className="text-stone-700 truncate max-w-[150px]">{o.clinician ?? '—'}</p>
                      <p className="text-xs text-stone-400 truncate max-w-[150px]">{o.reference_customer ?? ''}</p>
                    </td>
                    <td className="px-2.5 py-3">
                      <p className="text-stone-600 text-xs truncate max-w-[180px]">{o.owner_email ?? '—'}</p>
                    </td>
                    <td className="px-2.5 py-3 text-right whitespace-nowrap">
                      {/* Drafts are private — only the creator may resume/submit their own. */}
                      {currentUserId && o.user_id === currentUserId && product?.id && (
                        <Link href={`/gallery/${product.id}/order?draft=${o.id}` as Parameters<typeof Link>[0]['href']}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gold rounded-lg hover:bg-gold-dark transition-colors">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
                          </svg>
                          {tu('edit_draft')}
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ListPager
        page={page}
        total={totalPages}
        onPage={setPage}
        pageLabel={p => fmtDate(filtered[(p - 1) * PER_PAGE]?.created_at ?? null) || undefined}
      />

      <GridFloatingNav scrollRef={scrollRef} position="bottom-24 right-6" />
    </div>
  )
}
