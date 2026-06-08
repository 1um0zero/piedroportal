'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { duplicateOrderAction } from '@/app/actions/orders'
import { APPROVAL_STATES, PRODUCTION_STATES } from '@/lib/order-status'
import { nz } from '@/lib/format'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET = `${SUPABASE_URL}/storage/v1/object/public/products`

const STATUS_STYLES: Record<string, string> = {
  draft:         'bg-stone-100 text-stone-500',
  submitted:     'bg-blue-50 text-blue-600',
  approved:      'bg-green-50 text-green-600',
  in_production: 'bg-amber-50 text-amber-600',
  shipped:       'bg-purple-50 text-purple-600',
  delivered:     'bg-teal-50 text-teal-600',
  cancelled:     'bg-red-50 text-red-400',
}

const STATUS_KEYS = ['draft', 'submitted', 'approved', 'in_production', 'shipped', 'delivered', 'cancelled'] as const

type Props = {
  orders: any[]
  isAdmin: boolean
  currentUserId?: string
  age?: string
}

const AGE_OPTIONS = ['3m', '6m', '12m', 'all'] as const

// "New" = an order submitted and not yet processed by staff (the validation queue):
// status submitted + no Piedro triage yet (approval_state registered/null).
const isNewOrder = (o: { status?: string; approval_state?: string | null }) =>
  o.status === 'submitted' && (!o.approval_state || o.approval_state === 'registered')

// "Pending" = the client submitted but Piedro is holding a decision.
const PENDING_STATES = new Set(['under_analysis', 'need_attention', 'awaiting_payment'])
const isUrgent = (o: { additions?: { urgent?: boolean } | null }) => o.additions?.urgent === true

// Whether an order carries at least one filled addition.
function hasAdditions(adds: Record<string, any> | null | undefined): boolean {
  if (!adds) return false
  for (const v of Object.values(adds)) {
    if (v === null || v === undefined || v === '' || v === false) continue
    if (typeof v === 'object') {
      const sv = v as { l?: unknown; r?: unknown }
      if ((sv.l != null && sv.l !== '' && sv.l !== false) || (sv.r != null && sv.r !== '' && sv.r !== false)) return true
      continue
    }
    return true
  }
  return false
}

export default function OrdersPage({ orders, isAdmin, currentUserId, age = '3m' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t  = useTranslations('admin.orders')
  const tc = useTranslations('admin.common')
  const ts = useTranslations('dashboard.status')
  const ta = useTranslations('admin.approval')
  const tp = useTranslations('admin.production')
  const isAdminPath = pathname.startsWith('/admin')
  const searchParams = useSearchParams()
  const [search, setSearch]       = useState('')
  // Single active chip/filter: '' (all) | new | pending | approved | in_production | refused | <status>
  const [active, setActive]       = useState<string>(searchParams.get('new') === '1' ? 'new' : '')
  const [page, setPage]           = useState(1)
  const [repeating, setRepeating] = useState<string | null>(null)
  const PER_PAGE = 50

  async function handleRepeat(orderId: string, productId: string) {
    setRepeating(orderId)
    try {
      const result = await duplicateOrderAction(orderId)
      if (result.error || !result.id) throw new Error(result.error ?? 'Failed')
      router.push(`/gallery/${result.productId ?? productId}/order?draft=${result.id}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setRepeating(null)
    }
  }

  const filtered = useMemo(() => {
    setPage(1)  // reset to first page on filter change
    return orders.filter(o => {
      if (active === 'new')          { if (!isNewOrder(o)) return false }
      else if (active === 'pending') { if (!PENDING_STATES.has(o.approval_state)) return false }
      else if (active === 'refused') { if (o.approval_state !== 'refused') return false }
      else if (active)               { if (o.status !== active) return false }
      if (search) {
        const q = search.toLowerCase()
        const style = o.products?.style_name?.toLowerCase() ?? ''
        const colour = o.products?.colour_id?.toLowerCase() ?? ''
        const patient = (o.patient_name ?? '').toLowerCase()
        const ref = (o.reference_customer ?? '').toLowerCase()
        const company = (o.companies?.name ?? '').toLowerCase()
        if (!style.includes(q) && !colour.includes(q) && !patient.includes(q)
          && !ref.includes(q) && !company.includes(q)) return false
      }
      return true
    })
  }, [orders, search, active])

  const currentYear = new Date().getFullYear()

  // All chip counts (and how many of each are urgent) computed from the windowed set.
  const counts = useMemo(() => {
    const c = { total: orders.length, draft: 0, draftU: 0, new: 0, newU: 0,
      pending: 0, pendingU: 0, approved: 0, approvedU: 0, production: 0, productionU: 0, refused: 0 }
    for (const o of orders) {
      const u = isUrgent(o)
      if (o.status === 'draft')                 { c.draft++;      if (u) c.draftU++ }
      if (isNewOrder(o))                        { c.new++;        if (u) c.newU++ }
      if (PENDING_STATES.has(o.approval_state)) { c.pending++;    if (u) c.pendingU++ }
      if (o.status === 'approved')              { c.approved++;   if (u) c.approvedU++ }
      if (o.status === 'in_production')         { c.production++; if (u) c.productionU++ }
      if (o.approval_state === 'refused')       c.refused++
    }
    return c
  }, [orders])

  // Sequence: (Draft if any) → New → Pending → Approved → Production → Total (right).
  // Approved counts only orders not yet pulled into VSI production; Refused shows inside it.
  type Chip = { key: string; label: string; count: number; urgent: number; accent?: boolean }
  const chips: Chip[] = [
    ...(counts.draft > 0 ? [{ key: 'draft', label: t('metric_draft'), count: counts.draft, urgent: counts.draftU }] : []),
    { key: 'new',           label: t('metric_new'),        count: counts.new,        urgent: counts.newU, accent: true },
    { key: 'pending',       label: t('metric_pending'),    count: counts.pending,    urgent: counts.pendingU },
    { key: 'approved',      label: t('metric_approved'),   count: counts.approved,   urgent: counts.approvedU },
    { key: 'in_production', label: t('metric_production'), count: counts.production, urgent: counts.productionU },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-900">{t('title')}</h1>
        {!isAdmin && (
          <Link href="/gallery"
            className="px-4 py-2 text-sm font-medium bg-gold text-white rounded-lg
                       hover:bg-gold-dark transition-colors">
            {t('new_order')}
          </Link>
        )}
      </div>

      {/* Chips: Draft? → New → Pending → Approved(+refused) → Production → Total (right).
          Urgent is shown inside each chip (red dot), not as a separate chip. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {chips.map(c => (
          <div key={c.key} role="button" tabIndex={0}
            onClick={() => setActive(a => a === c.key ? '' : c.key)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setActive(a => a === c.key ? '' : c.key) }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer
              ${active === c.key
                ? 'border-gold bg-gold/5'
                : c.accent
                  ? 'border-gold/40 bg-gold/[0.03] hover:border-gold/60'
                  : 'border-stone-100 bg-white hover:border-stone-200'}`}
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className={`text-2xl font-bold ${c.accent ? 'text-gold-dark' : 'text-stone-800'}`}>{nz(c.count)}</p>
            <p className="text-xs text-stone-500 mt-0.5">{c.label}</p>
            {c.urgent > 0 && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{c.urgent} {t('metric_urgent').toLowerCase()}
              </p>
            )}
            {c.key === 'approved' && counts.refused > 0 && (
              <span onClick={e => { e.stopPropagation(); setActive('refused') }}
                className="block mt-1 text-[11px] font-medium text-stone-500 hover:text-red-600 hover:underline">
                {counts.refused} {ta('refused').toLowerCase()}
              </span>
            )}
          </div>
        ))}

        {/* Total — to the right; on admin it carries the age-window selector */}
        <div className={`p-3 rounded-xl border transition-all
          ${active === '' ? 'border-gold bg-gold/5' : 'border-stone-100 bg-white'}`}
          style={{ boxShadow: 'var(--shadow-card)' }}>
          <button onClick={() => setActive('')} className="text-left w-full">
            <p className="text-2xl font-bold text-stone-800">{nz(counts.total)}</p>
            <p className="text-xs text-stone-500 mt-0.5">{t('metric_total')}</p>
          </button>
          {isAdmin && (
            <select value={age}
              onClick={e => e.stopPropagation()}
              onChange={e => router.push(`${pathname}?age=${e.target.value}` as Parameters<typeof router.push>[0])}
              className="mt-1.5 w-full rounded-md border border-stone-200 px-1.5 py-0.5 text-[11px] text-stone-500 focus:border-gold focus:outline-none">
              {AGE_OPTIONS.map(o => <option key={o} value={o}>{t(`age_${o}`)}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex items-center">
          <svg className="absolute left-2.5 w-3.5 h-3.5 text-stone-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('search_placeholder')}
            className="h-9 pl-8 pr-3 text-sm bg-white border border-stone-200 rounded-lg w-56
                       focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                       transition-all focus:w-72"/>
        </div>

        <div className="relative">
          <select value={(STATUS_KEYS as readonly string[]).includes(active) ? active : ''} onChange={e => setActive(e.target.value)}
            className="h-9 px-3 pr-8 text-sm bg-white border border-stone-200 rounded-lg
                       appearance-none focus:outline-none focus:ring-2 focus:ring-gold/30">
            <option value="">{t('all_statuses')}</option>
            {STATUS_KEYS.map(k => (
              <option key={k} value={k}>{ts(k)}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>

        <p className="ml-auto text-sm text-stone-400">
          {t('count', { count: filtered.length })}
          {filtered.length > PER_PAGE && ` · ${t('page_indicator', { page, total: Math.ceil(filtered.length / PER_PAGE) })}`}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[14px] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100">
              <tr className="text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3 text-left">{t('col_product')}</th>
                <th className="px-4 py-3 text-left">{t('col_patient')}</th>
                {isAdmin && <th className="px-4 py-3 text-left">{t('col_company')}</th>}
                <th className="px-4 py-3 text-left">{t('col_status')}</th>
                <th className="px-4 py-3 text-left">{t('col_date')}</th>
                <th className="px-4 py-3 text-left">{t('col_unit')}</th>
                <th className="px-4 py-3 text-left">{t('col_additions')}</th>
                <th className="px-4 py-3 text-left">{t('col_pdf')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8}
                    className="px-4 py-12 text-center text-stone-400 text-sm">
                    {t('no_orders')}
                  </td>
                </tr>
              ) : filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(o => {
                const product = o.products
                const company = o.companies
                const isUrgent = o.additions?.urgent === true
                return (
                  <tr key={o.id} className="hover:bg-stone-50 transition-colors cursor-pointer"
                    onClick={() => router.push((isAdminPath ? `/admin/orders/${o.id}` : `/orders/${o.id}`) as Parameters<typeof router.push>[0])}>

                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product?.picture_name ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-50 shrink-0">
                            <Image
                              src={`${BUCKET}/${product.picture_name}`}
                              alt={product.style_name ?? ''}
                              fill sizes="40px" className="object-contain p-0.5"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-stone-100 shrink-0
                                          flex items-center justify-center text-xs text-stone-400">
                            {product?.style_name?.slice(0, 4) ?? '—'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-stone-800 truncate">
                            {product?.style_name ?? '—'}
                            {isUrgent && <span className="ml-1.5 text-red-500">🔴</span>}
                          </p>
                          <p className="text-xs text-stone-400 truncate">
                            {product?.colour_id} · {product?.closure}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Patient */}
                    <td className="px-4 py-3">
                      <p className="text-stone-700 truncate max-w-[150px]">
                        {o.patient_name ?? '—'}
                      </p>
                      <p className="text-xs text-stone-400">{o.reference_customer ?? ''}</p>
                    </td>
                    {/* Company (admin only) */}
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <p className="text-stone-700 text-sm truncate max-w-[180px]">
                          {company?.name ?? '—'}
                        </p>
                        <p className="text-xs text-stone-400">{company?.erp_code ?? ''}</p>
                      </td>
                    )}
                    {/* Status — single current state: production (VSI) > approval (Piedro) > portal status */}
                    <td className="px-4 py-3">
                      {(() => {
                        if (o.production_state) {
                          const p = PRODUCTION_STATES.find(s => s.value === o.production_state)
                          return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700">{p ? tp(p.value) : o.production_state}</span>
                        }
                        if (o.approval_state && o.approval_state !== 'registered') {
                          const a = APPROVAL_STATES.find(s => s.value === o.approval_state)
                          return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${a?.color ?? 'bg-stone-100 text-stone-500'}`}>{a ? ta(a.value) : o.approval_state}</span>
                        }
                        return <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[o.status] ?? 'bg-stone-100 text-stone-500'}`}>{ts.has(o.status) ? ts(o.status) : o.status}</span>
                      })()}
                    </td>
                    {/* Date — year shown only for orders before the current year */}
                    <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                      {o.created_at
                        ? (() => {
                            const d = new Date(o.created_at)
                            return d.toLocaleDateString(locale, d.getFullYear() < currentYear
                              ? { day:'2-digit', month:'short', year:'numeric' }
                              : { day:'2-digit', month:'short' })
                          })()
                        : '—'}
                    </td>
                    {/* Unit */}
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {o.unit ?? '—'}
                    </td>
                    {/* Additions */}
                    <td className="px-4 py-3">
                      {hasAdditions(o.additions)
                        ? <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gold/10 text-gold-dark">{t('additions_yes')}</span>
                        : <span className="text-stone-300 text-xs">—</span>}
                    </td>
                    {/* PDF */}
                    <td className="px-4 py-3">
                      {o.pdf_url ? (
                        <a href={o.pdf_url} target="_blank" rel="noopener noreferrer"
                          title={t('download_pdf')}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg
                                     text-gold hover:bg-gold/10 transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
                          </svg>
                        </a>
                      ) : (
                        <span className="text-stone-200 text-xs pl-1">—</span>
                      )}
                    </td>
                    {/* Repeat — only on the requester's own orders (server also enforces this) */}
                    <td className="px-2 py-3">
                      {currentUserId && o.user_id === currentUserId ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRepeat(o.id, o.products?.id) }}
                        disabled={repeating === o.id}
                        title={t('repeat_order')}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg
                                   text-stone-400 hover:text-gold hover:bg-gold/10 transition-colors
                                   disabled:opacity-40">
                        {repeating === o.id ? (
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
                          </svg>
                        )}
                      </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filtered.length > PER_PAGE && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg
                       disabled:opacity-40 hover:border-stone-300 transition-colors">
            ← {tc('prev')}
          </button>

          {Array.from({ length: Math.min(7, Math.ceil(filtered.length / PER_PAGE)) }, (_, i) => {
            const total = Math.ceil(filtered.length / PER_PAGE)
            let p: number
            if (total <= 7) p = i + 1
            else if (page <= 4) p = i + 1
            else if (page >= total - 3) p = total - 6 + i
            else p = page - 3 + i
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 text-sm rounded-lg border transition-colors
                  ${p === page
                    ? 'bg-gold text-white border-gold'
                    : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}>
                {p}
              </button>
            )
          })}

          <button
            onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / PER_PAGE), p + 1))}
            disabled={page >= Math.ceil(filtered.length / PER_PAGE)}
            className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg
                       disabled:opacity-40 hover:border-stone-300 transition-colors">
            {tc('next')} →
          </button>
        </div>
      )}
    </div>
  )
}
