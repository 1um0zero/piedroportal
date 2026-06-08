'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
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

type Metrics = {
  total: number; new: number; draft: number; submitted: number
  approved: number; production: number; urgent: number
}

type Props = {
  orders: any[]
  metrics: Metrics
  isAdmin: boolean
  currentUserId?: string
}

// "New" = submitted by the client and not yet touched by staff (the validation queue).
const isNewOrder = (o: { status?: string; approval_state?: string | null }) =>
  o.status === 'submitted' && (!o.approval_state || o.approval_state === 'registered')

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

export default function OrdersPage({ orders, metrics, isAdmin, currentUserId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const t  = useTranslations('admin.orders')
  const tc = useTranslations('admin.common')
  const ts = useTranslations('dashboard.status')
  const ta = useTranslations('admin.approval')
  const tp = useTranslations('admin.production')
  const isAdminPath = pathname.startsWith('/admin')
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [newOnly, setNewOnly]       = useState(false)
  const [page, setPage]             = useState(1)
  const [repeating, setRepeating]   = useState<string | null>(null)
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
      if (newOnly && !isNewOrder(o)) return false
      if (statusFilter && o.status !== statusFilter) return false
      if (urgentOnly && !o.additions?.urgent) return false
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
  }, [orders, search, statusFilter, urgentOnly, newOnly])

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

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {([
          { key: 'total',      label: t('metric_total'),       value: metrics.total,
            active: !newOnly && !urgentOnly && statusFilter === '',
            onClick: () => { setNewOnly(false); setUrgentOnly(false); setStatus('') } },
          { key: 'new',        label: t('metric_new'),         value: metrics.new, accent: true,
            active: newOnly,
            onClick: () => { setNewOnly(v => !v); setStatus(''); setUrgentOnly(false) } },
          { key: 'draft',      label: t('metric_draft'),       value: metrics.draft,
            active: statusFilter === 'draft',
            onClick: () => { setNewOnly(false); setStatus(s => s === 'draft' ? '' : 'draft') } },
          { key: 'submitted',  label: t('metric_submitted'),   value: metrics.submitted,
            active: statusFilter === 'submitted',
            onClick: () => { setNewOnly(false); setStatus(s => s === 'submitted' ? '' : 'submitted') } },
          { key: 'approved',   label: t('metric_approved'),    value: metrics.approved,
            active: statusFilter === 'approved',
            onClick: () => { setNewOnly(false); setStatus(s => s === 'approved' ? '' : 'approved') } },
          { key: 'production', label: t('metric_production'),   value: metrics.production,
            active: statusFilter === 'in_production',
            onClick: () => { setNewOnly(false); setStatus(s => s === 'in_production' ? '' : 'in_production') } },
          { key: 'urgent',     label: `🔴 ${t('metric_urgent')}`, value: metrics.urgent,
            active: urgentOnly,
            onClick: () => { setUrgentOnly(u => !u); setNewOnly(false) } },
        ]).map(({ key, label, value, active, accent, onClick }) => (
          <button key={key} onClick={onClick}
            className={`p-3 rounded-xl border text-left transition-all
              ${active
                ? 'border-gold bg-gold/5'
                : accent
                  ? 'border-gold/40 bg-gold/[0.03] hover:border-gold/60'
                  : 'border-stone-100 bg-white hover:border-stone-200'}`}
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className={`text-2xl font-bold ${accent ? 'text-gold-dark' : 'text-stone-800'}`}>{nz(value)}</p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
          </button>
        ))}
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
          <select value={statusFilter} onChange={e => setStatus(e.target.value)}
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

        {urgentOnly && (
          <button onClick={() => setUrgentOnly(false)}
            className="h-9 px-3 text-sm font-medium text-red-500 border border-red-200
                       rounded-lg hover:bg-red-50 transition-colors">
            🔴 {t('urgent_only')} ×
          </button>
        )}

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
                    {/* Status */}
                    <td className="px-4 py-3 space-y-1">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full
                                       ${STATUS_STYLES[o.status] ?? 'bg-stone-100 text-stone-500'}`}>
                        {ts.has(o.status) ? ts(o.status) : o.status}
                      </span>
                      {/* Approval state badge */}
                      {o.approval_state && o.approval_state !== 'registered' && (() => {
                        const a = APPROVAL_STATES.find(s => s.value === o.approval_state)
                        return a ? (
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${a.color}`}>
                            {ta(a.value)}
                          </span>
                        ) : null
                      })()}
                      {/* Production state badge */}
                      {o.production_state && (() => {
                        const p = PRODUCTION_STATES.find(s => s.value === o.production_state)
                        return p ? (
                          <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-700">
                            {tp(p.value)}
                          </span>
                        ) : null
                      })()}
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                      {o.created_at
                        ? new Date(o.created_at).toLocaleDateString(locale, { day:'2-digit', month:'short', year:'2-digit' })
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
