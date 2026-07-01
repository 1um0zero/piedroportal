'use client'

import { useState, useMemo, useRef, useTransition } from 'react'
import { useListNav } from '@/components/ui/use-list-nav'
import { productImageUrl } from '@/lib/products/image-url'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { duplicateOrderAction, deleteOrderAction } from '@/app/actions/orders'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { PRODUCTION_STATES, isOnProductionTrail, PRODUCTION_SEQUENCE, USER_PRODUCTION_SEQUENCE, userTrailIndex } from '@/lib/order-status'
import { ProductionTrail } from './ProductionTrail'
import { nz, orderNumber } from '@/lib/format'
import { matchesAny } from '@/lib/search'
import { daysUntil } from '@/lib/dispatch'
import { GridFloatingNav, ListPager } from '@/components/ui/table-controls'

const STATUS_KEYS = ['draft', 'submitted', 'approved', 'in_production', 'shipped', 'delivered', 'cancelled'] as const

// Order unit → translation key in the `order` namespace.
const UNIT_KEYS: Record<string, string> = {
  PAIR: 'unit_pair', LEFT: 'unit_left', RIGHT: 'unit_right',
  LEFT_RIGHT: 'unit_lr', DIFF_SIZES: 'unit_sizes',
}

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[]
  isAdmin: boolean
  /** Admin/staff/company-admin view: shows Clinician (+ Company) instead of Patient/Ref. */
  canSeeClinician?: boolean
  currentUserId?: string
  age?: string
  from?: string
  to?: string
  showDispatch?: boolean
}

const AGE_OPTIONS = ['3m', '6m', '12m', 'all'] as const

// Days until expected dispatch — plain text (no chip), shown in the Delivery
// column before an order is delivered. Green with room, orange when close, red
// (and "+n") when overdue.
function DispatchDays({ o, t }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  o: any
  t: (k: string, v?: Record<string, string | number>) => string
}) {
  const n = daysUntil(o.expected_dispatch_date)
  if (n === null) return <span className="text-stone-300">—</span>
  const overdue = n < 0
  const cls = overdue ? 'text-red-600' : n <= 3 ? 'text-orange-600' : 'text-stone-500'
  return (
    <span title={overdue ? t('dispatch_overdue', { n: -n }) : t('dispatch_in', { n })}
      className={`tabular-nums font-medium ${cls}`}>
      {overdue ? `+${-n}` : n}<span className="font-normal opacity-60 ml-0.5">d</span>
    </span>
  )
}

// Carrier truck glyph for the Delivery column.
function TruckGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 18V6a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1" />
      <path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-1" />
      <path d="M9 18h2" />
      <circle cx="6.5" cy="18" r="1.8" />
      <circle cx="16.5" cy="18" r="1.8" />
    </svg>
  )
}

// Gold filled emblem on the Unit cell when the order carries additions
// (replaces the old standalone Additions column). A clear "+" badge.
function AdditionsMark({ title }: { title: string }) {
  return (
    <span title={title}
      className="inline-flex shrink-0 items-center justify-center w-[18px] h-[18px] rounded-full bg-gold text-white shadow-sm">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={3.5} strokeLinecap="round" aria-hidden="true">
        <line x1="12" y1="6" x2="12" y2="18" /><line x1="6" y1="12" x2="18" y2="12" />
      </svg>
    </span>
  )
}

// Approval/cancel mark next to the Piedro order number: elegant green check
// (approved), amber outline triangle (on hold), thin red cross (cancelled).
function OrderStatusMark({ o, title }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  o: any
  title?: string
}) {
  const st = o.status as string | undefined
  const ap = o.approval_state as string | undefined
  const cancelled = st === 'cancelled' || ap === 'refused'
  const pending = !cancelled && PENDING_STATES.has(ap ?? '')
  const approved = !cancelled && !pending &&
    (ap === 'approved' || st === 'approved' || st === 'in_production' || st === 'shipped' || st === 'delivered')
  const svg = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none',
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (cancelled) return <span title={title} className="inline-flex shrink-0"><svg {...svg} stroke="#dc2626" strokeWidth={1.5}><path d="M6 6l12 12M18 6 6 18" /></svg></span>
  if (pending)   return <span title={title} className="inline-flex shrink-0"><svg {...svg} stroke="#d97706" strokeWidth={1.5}><path d="M12 4.5 21 20H3z" /><line x1="12" y1="10.5" x2="12" y2="14.5" /><line x1="12" y1="17" x2="12" y2="17" /></svg></span>
  if (approved)  return <span title={title} className="inline-flex shrink-0"><svg {...svg} stroke="#059669" strokeWidth={2}><path d="M5 12.5 10 17.5 19.5 7" /></svg></span>
  return null
}

// "New" = an order submitted and not yet processed by staff (the validation queue):
// status submitted + no Piedro triage yet (approval_state registered/null).
const isNewOrder = (o: { status?: string; approval_state?: string | null }) =>
  o.status === 'submitted' && (!o.approval_state || o.approval_state === 'registered')

// "Pending" = Piedro is holding a decision AND the order is not yet in production
// (status still 'submitted'). Buckets are mutually exclusive: an order already in
// production is counted in Production, never double-counted in Pending.
const PENDING_STATES = new Set(['under_analysis', 'need_attention', 'awaiting_payment'])
const isPending = (o: { status?: string; approval_state?: string | null }) =>
  o.status === 'submitted' && PENDING_STATES.has(o.approval_state ?? '')
const isUrgent = (o: { additions?: { urgent?: boolean } | null }) => o.additions?.urgent === true

// Whether an order carries at least one filled addition.
function hasAdditions(adds: Record<string, unknown> | null | undefined): boolean {
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

export default function OrdersPage({ orders, isAdmin, canSeeClinician = false, currentUserId, age = '3m', from, to, showDispatch = false }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const { guard } = useImpersonation()
  const t  = useTranslations('admin.orders')
  const ts = useTranslations('dashboard.status')
  const ta = useTranslations('admin.approval')
  const tp = useTranslations('admin.production')
  const tu = useTranslations('order')
  const isAdminPath = pathname.startsWith('/admin')
  // Staff-style view (Piedro admin, staff, company admin): Clinician + Company,
  // never the patient name. Regular users see Patient / Ref instead.
  const staffView = isAdmin || canSeeClinician
  const searchParams = useSearchParams()
  const [search, setSearch]       = useState('')
  // Single active chip/filter: '' (all) | new | pending | approved | in_production | refused | <status>
  const [active, setActive]       = useState<string>(searchParams.get('new') === '1' ? 'new' : '')
  // When true, narrow the active bucket to urgent orders only (set by the red dot).
  const [urgentFilter, setUrgentFilter] = useState(false)
  const { page, setPage, rememberReturn } = useListNav(isAdminPath ? 'admin-orders' : 'orders')
  const [repeating, setRepeating] = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)
  // Order whose detail page is being opened — gives the clicked row an instant
  // "the portal heard you" cue while the route-level skeleton loads.
  const [openingId, setOpeningId] = useState<string | null>(null)
  // Age window (quick presets) or a specific from–to period — server-side.
  const [periodMode, setPeriodMode] = useState(!!(from || to))
  const [fromD, setFromD] = useState(from ?? '')
  const [toD,   setToD]   = useState(to ?? '')
  const [isWindowPending, startWindow] = useTransition()
  // Window changes (age/period) hit the server, so run them in a transition and
  // show a "processing" hint — otherwise it looks frozen (esp. on a big "all").
  const pushWindow = (qs: string) =>
    startWindow(() => router.push(`${pathname}?${qs}` as Parameters<typeof router.push>[0]))
  const applyPeriod = (f: string, tt: string) => { if (f && tt) pushWindow(`from=${f}&to=${tt}`) }

  const selectChip   = (key: string) => { setUrgentFilter(false); setActive(a => a === key ? '' : key) }
  const selectUrgent = (key: string) => { setActive(key); setUrgentFilter(true) }
  const PER_PAGE = 50
  // Ref of the horizontally-scrollable table wrapper (drives GridFloatingNav).
  const scrollRef = useRef<HTMLDivElement>(null)
  // Sticky identity columns (Nr / Date / Product) keep the order recognisable when
  // the grid scrolls sideways. Fixed widths so the cumulative left offsets are exact.
  const NR_W = 76, DATE_W = 92, PROD_W = 240
  const anchorTh = 'sticky z-[2] bg-white'
  const anchorTd = 'sticky z-[1] bg-white group-hover:bg-stone-50'

  async function handleDelete(orderId: string) {
    if (!confirm(t('delete_confirm'))) return
    if (!(await guard())) return
    setDeleting(orderId)
    try {
      const res = await deleteOrderAction(orderId)
      if (res.error) throw new Error(res.error)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setDeleting(null)
    }
  }

  // A client may permanently delete their own order only while Piedro hasn't acted:
  // still a draft, or submitted-but-untriaged (registered/null) and not in production.
  const clientCanDelete = (o: { status?: string; approval_state?: string | null; production_state?: string | null }) =>
    o.status === 'draft' ||
    (o.status === 'submitted' && (!o.approval_state || o.approval_state === 'registered') && !o.production_state)

  // Note: cancelling an order (Piedro admin soft-cancel) lives inside the order
  // detail view now — it's a deliberate, guarded action, not a one-click affordance
  // sitting in the list next to repeat/delete.

  async function handleRepeat(orderId: string, productId: string) {
    if (!(await guard())) return
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
      else if (active === 'pending') { if (!isPending(o)) return false }
      else if (active === 'refused') { if (o.approval_state !== 'refused') return false }
      else if (active)               { if (o.status !== active) return false }
      if (urgentFilter && !isUrgent(o)) return false
      if (search && !matchesAny(
        [o.piedro_order_id, o.order_seq != null ? orderNumber(o.order_seq) : null, o.order_seq != null ? String(o.order_seq) : null, o.products?.style_name, o.products?.colour_id, o.patient_name, o.reference_customer, o.companies?.name],
        search,
      )) return false
      return true
    })
  }, [orders, search, active, urgentFilter])

  const currentYear = new Date().getFullYear()

  // All chip counts (and how many of each are urgent) computed from the windowed set.
  const counts = useMemo(() => {
    const c = { total: 0, delivered: 0, shipped: 0, shippedU: 0, draft: 0, draftU: 0, new: 0, newU: 0,
      pending: 0, pendingU: 0, approved: 0, approvedU: 0, production: 0, productionU: 0, refused: 0 }
    for (const o of orders) {
      const u = isUrgent(o)
      // Total is every active order; Delivered is counted (and shown) separately.
      if (o.status === 'delivered') c.delivered++
      else c.total++
      if (o.status === 'draft')                 { c.draft++;      if (u) c.draftU++ }
      if (isNewOrder(o))                        { c.new++;        if (u) c.newU++ }
      if (isPending(o))                         { c.pending++;    if (u) c.pendingU++ }
      if (o.status === 'approved')              { c.approved++;   if (u) c.approvedU++ }
      if (o.status === 'in_production')         { c.production++; if (u) c.productionU++ }
      if (o.status === 'shipped')               { c.shipped++;    if (u) c.shippedU++ }
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
    ...(counts.shipped > 0 ? [{ key: 'shipped', label: t('metric_shipped'), count: counts.shipped, urgent: counts.shippedU }] : []),
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {chips.map(c => (
          <div key={c.key} role="button" tabIndex={0}
            onClick={() => selectChip(c.key)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') selectChip(c.key) }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer
              ${active === c.key && !urgentFilter
                ? 'border-gold bg-gold/5'
                : 'border-stone-100 bg-white hover:border-stone-200'}`}
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className={`text-2xl font-bold ${c.accent ? 'text-gold-dark' : 'text-stone-800'}`}>{nz(c.count)}</p>
            <p className="text-xs text-stone-500 mt-0.5">{c.label}</p>
            {c.urgent > 0 && (
              <button type="button"
                onClick={e => { e.stopPropagation(); selectUrgent(c.key) }}
                title={t('urgent_only')}
                className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors
                  ${active === c.key && urgentFilter ? 'bg-red-500 text-white' : 'text-red-500 hover:bg-red-50'}`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${active === c.key && urgentFilter ? 'bg-white' : 'bg-red-500'}`} />
                {c.urgent} {t('metric_urgent').toLowerCase()}
              </button>
            )}
            {c.key === 'approved' && counts.refused > 0 && (
              <span onClick={e => { e.stopPropagation(); selectChip('refused') }}
                className="block mt-1 text-[11px] font-medium text-stone-500 hover:text-red-600 hover:underline">
                {counts.refused} {ta('refused').toLowerCase()}
              </span>
            )}
          </div>
        ))}

        {/* Total — every active order (delivered counted separately, on the right) */}
        <div className={`p-3 rounded-xl border transition-all cursor-pointer
          ${active === '' && !urgentFilter ? 'border-gold bg-gold/5' : 'border-stone-100 bg-white hover:border-stone-200'}`}
          role="button" tabIndex={0}
          onClick={() => { setActive(''); setUrgentFilter(false) }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setActive(''); setUrgentFilter(false) } }}
          style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="text-2xl font-bold text-stone-800">{nz(counts.total)}</p>
          <p className="text-xs text-stone-500 mt-0.5">{t('metric_total')}</p>
        </div>

        {/* Delivered — separate total, to the right of Total */}
        <div className={`p-3 rounded-xl border transition-all cursor-pointer
          ${active === 'delivered' && !urgentFilter ? 'border-gold bg-gold/5' : 'border-stone-100 bg-white hover:border-stone-200'}`}
          role="button" tabIndex={0}
          onClick={() => selectChip('delivered')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') selectChip('delivered') }}
          style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="text-2xl font-bold text-stone-800">{nz(counts.delivered)}</p>
          <p className="text-xs text-stone-500 mt-0.5">{t('metric_delivered')}</p>
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
            title={t('search_hint')}
            className="h-9 pl-8 pr-3 text-sm bg-white border border-stone-200 rounded-lg w-56
                       focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                       transition-all focus:w-72"/>
        </div>

        <div className="relative">
          <select value={(STATUS_KEYS as readonly string[]).includes(active) ? active : ''} onChange={e => { setUrgentFilter(false); setActive(e.target.value) }}
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

        {/* Age window — quick presets, or a specific from–to period. Applies to
            every status in view (it's the server-side fetch window). */}
        {(
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={periodMode ? 'period' : age}
                onChange={e => {
                  const v = e.target.value
                  if (v === 'period') { setPeriodMode(true) }
                  else { setPeriodMode(false); pushWindow(`age=${v}`) }
                }}
                className="h-9 px-3 pr-8 text-sm bg-white border border-stone-200 rounded-lg
                           appearance-none focus:outline-none focus:ring-2 focus:ring-gold/30">
                {AGE_OPTIONS.map(o => <option key={o} value={o}>{t(`age_${o}`)}</option>)}
                <option value="period">{t('age_period')}</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
            {periodMode && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={fromD} max={toD || undefined}
                  onChange={e => { setFromD(e.target.value); applyPeriod(e.target.value, toD) }}
                  className="h-9 px-2 text-sm bg-white border border-stone-200 rounded-lg focus:border-gold focus:outline-none" />
                <span className="text-stone-400 text-sm">–</span>
                <input type="date" value={toD} min={fromD || undefined}
                  onChange={e => { setToD(e.target.value); applyPeriod(fromD, e.target.value) }}
                  className="h-9 px-2 text-sm bg-white border border-stone-200 rounded-lg focus:border-gold focus:outline-none" />
              </div>
            )}
            {isWindowPending && (
              <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
                <span className="w-3.5 h-3.5 border-2 border-stone-300 border-t-gold rounded-full animate-spin" />
                {t('processing')}
              </span>
            )}
          </div>
        )}

        <p className="ml-auto text-sm text-stone-400">
          {t('count', { count: filtered.length })}
          {filtered.length > PER_PAGE && ` · ${t('page_indicator', { page, total: Math.ceil(filtered.length / PER_PAGE) })}`}
        </p>
      </div>

      {/* Table */}
      <div className={`bg-white rounded-[14px] overflow-hidden transition-opacity ${isWindowPending ? 'opacity-60' : ''}`}
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100">
              <tr className="text-xs text-stone-400 font-semibold uppercase tracking-wider">
                <th className={`px-2.5 py-3 text-left left-0 ${anchorTh}`} style={{ width: NR_W, minWidth: NR_W }}>{t('col_number')}</th>
                <th className={`px-2.5 py-3 text-left ${anchorTh}`} style={{ left: NR_W, width: DATE_W, minWidth: DATE_W }}>{t('col_date')}</th>
                <th className={`px-2.5 py-3 text-left border-r border-stone-100 ${anchorTh}`} style={{ left: NR_W + DATE_W, width: PROD_W, minWidth: PROD_W }}>{t('col_product')}</th>
                <th className="px-2.5 py-3 text-left">{t('col_unit')}</th>
                {isAdmin && <th className="px-2.5 py-3 text-left">{t('col_company')}</th>}
                <th className="px-2.5 py-3 text-left">{staffView ? t('col_clinician') : t('col_patient')}</th>
                <th className="px-2.5 py-3 text-left">{t('col_piedro_order')}</th>
                <th className="px-2.5 py-3 text-left">{t('col_status')}</th>
                <th className="px-2.5 py-3 text-left">{t('col_delivery')}</th>
                <th className="px-2.5 py-3 text-left">{t('col_pdf')}</th>
                <th className="px-2.5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 11 : 10}
                    className="px-4 py-12 text-center text-stone-400 text-sm">
                    {t('no_orders')}
                  </td>
                </tr>
              ) : filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(o => {
                const product = o.products
                const company = o.companies
                const isUrgent = o.additions?.urgent === true
                const isStock = o.kind === 'stock'
                const detailHref = isStock
                  ? (isAdminPath ? `/admin/orders/stock/${o.id}` : `/orders/stock/${o.id}`)
                  : (isAdminPath ? `/admin/orders/${o.id}` : `/orders/${o.id}`)
                return (
                  <tr key={o.id} aria-busy={openingId === o.id}
                    className={`group hover:bg-stone-50 transition-all cursor-pointer ${openingId === o.id ? 'opacity-50' : ''}`}
                    onClick={() => { setOpeningId(o.id); rememberReturn(); router.push(detailHref as Parameters<typeof router.push>[0]) }}>

                    {/* Order № — the restored legacy sequential number; stock orders have none */}
                    <td className={`px-2.5 py-3 text-stone-700 text-xs font-semibold tabular-nums whitespace-nowrap left-0 ${anchorTd}`} style={{ width: NR_W, minWidth: NR_W }}>
                      {o.order_seq != null ? `#${orderNumber(o.order_seq)}` : '—'}
                    </td>
                    {/* Date — year shown only for orders before the current year */}
                    <td className={`px-2.5 py-3 text-stone-500 text-xs whitespace-nowrap ${anchorTd}`} style={{ left: NR_W, width: DATE_W, minWidth: DATE_W }}>
                      {o.created_at
                        ? (() => {
                            const d = new Date(o.created_at)
                            return d.toLocaleDateString(locale, d.getFullYear() < currentYear
                              ? { day:'2-digit', month:'short', year:'numeric' }
                              : { day:'2-digit', month:'short' })
                          })()
                        : '—'}
                    </td>
                    {/* Product */}
                    <td className={`px-2.5 py-3 border-r border-stone-100 ${anchorTd}`} style={{ left: NR_W + DATE_W, width: PROD_W, minWidth: PROD_W }}>
                      <div className="flex items-center gap-3">
                        {product?.picture_name ? (
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-stone-50 shrink-0">
                            <Image
                              src={productImageUrl(product.picture_name)}
                              alt={product.style_name ?? ''}
                              fill sizes="36px" className="object-contain p-0.5"
                            />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-stone-100 shrink-0
                                          flex items-center justify-center text-xs text-stone-400">
                            {product?.style_name?.slice(0, 4) ?? '—'}
                          </div>
                        )}
                        <div className="min-w-0">
                          {isStock ? (
                            <>
                              <p className="font-medium text-stone-800 truncate flex items-center gap-1.5">
                                <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded bg-gold/15 text-gold-dark uppercase tracking-wide">{t('stock_tag')}</span>
                                {product?.style_name ?? ''}
                              </p>
                              <p className="text-xs text-stone-400 truncate">
                                {t('stock_line', { models: o.stock_models, pairs: o.stock_pairs })}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-stone-800 truncate">
                                {product?.colour_id ?? product?.style_name ?? '—'}
                              </p>
                              <p className="text-xs text-stone-400 truncate">
                                {product?.closure ?? ''}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Unit (+ additions mark — replaces the old Additions column) */}
                    <td className="px-3 py-3 text-stone-500 text-xs">
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        {o.unit && UNIT_KEYS[o.unit] ? tu(UNIT_KEYS[o.unit]) : (o.unit ?? '—')}
                        {hasAdditions(o.additions) && <AdditionsMark title={t('additions_yes')} />}
                      </span>
                    </td>
                    {/* Company — Piedro admin only (a company admin sees a single company) */}
                    {isAdmin && (
                      <td className="px-2.5 py-3">
                        <p className="text-stone-700 text-sm truncate max-w-[130px]">
                          {company?.name ?? '—'}
                        </p>
                        <p className="text-xs text-stone-400">{company?.erp_code ?? ''}</p>
                      </td>
                    )}
                    {/* Clinician (staff) | Patient (user) — Ref shown to everyone */}
                    <td className="px-2.5 py-3">
                      <p className="text-stone-700 truncate max-w-[130px]">
                        {staffView ? (o.clinician ?? '—') : (o.patient_name ?? '—')}
                      </p>
                      <p className="text-xs text-stone-400 truncate max-w-[130px]">{o.reference_customer ?? ''}</p>
                    </td>
                    {/* Piedro Order # — ERP order number with an approval/cancel mark.
                        While still empty, a "New" order shows its badge here. */}
                    <td className="px-2.5 py-3">
                      {(() => {
                        const apTitle = o.approval_state ? (ta.has(o.approval_state) ? ta(o.approval_state) : o.approval_state) : undefined
                        if (o.piedro_order_id) {
                          return (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-semibold text-stone-700 tabular-nums">{o.piedro_order_id}</span>
                              <OrderStatusMark o={o} title={apTitle} />
                            </span>
                          )
                        }
                        if (isNewOrder(o)) {
                          return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600">{t('metric_new')}</span>
                        }
                        return (
                          <span className="inline-flex items-center gap-1.5 text-stone-300">
                            —<OrderStatusMark o={o} title={apTitle} />
                          </span>
                        )
                      })()}
                    </td>
                    {/* Status — production trail (factory journey). Off-trail states
                        (fitting/dispatched) show a chip; non-production orders a dash. */}
                    <td className="px-2.5 py-3">
                      <div className="flex items-center gap-1.5">
                        {isUrgent && <span title={t('urgent_only')} className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                        {(() => {
                          if (isOnProductionTrail(o.production_state)) {
                            // Clients (incl. company admins) see the simplified
                            // 3-step journey; only Piedro back-office keeps the full
                            // shop-floor sequence.
                            if (!isAdmin) {
                              const ci = userTrailIndex(o.production_state)
                              if (ci < 0) return <span className="text-stone-300 text-xs">—</span>
                              return <ProductionTrail state={o.production_state!} sequence={USER_PRODUCTION_SEQUENCE} current={ci} label={v => (tp.has(v) ? tp(v) : v)} size={15} />
                            }
                            return <ProductionTrail state={o.production_state!} sequence={PRODUCTION_SEQUENCE} label={v => (tp.has(v) ? tp(v) : v)} size={15} />
                          }
                          if (o.production_state) {
                            const p = PRODUCTION_STATES.find(s => s.value === o.production_state)
                            return <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700">{p ? tp(p.value) : o.production_state}</span>
                          }
                          return <span className="text-stone-300 text-xs">—</span>
                        })()}
                      </div>
                    </td>
                    {/* Delivery — once dispatched, the carrier truck: a link to the
                        tracking page showing the tracking code when present, else the
                        truck alone. Before dispatch, staff see days-to-dispatch;
                        clients see nothing (delivery times are intentionally hidden). */}
                    <td className="px-2.5 py-3 text-xs whitespace-nowrap">
                      {/* A tracking link exists from dispatch onward (UPS assigns it
                          before delivery), so show it as soon as it's present —
                          regardless of delivered status. Delivered without a link
                          still shows the truck alone. Otherwise: staff see the
                          dispatch countdown; clients see nothing. */}
                      {o.tracking_link ? (
                        <a href={o.tracking_link} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          title={o.tracking_code ?? t('tracking')}
                          className="inline-flex items-center gap-1.5 font-medium text-teal-700 hover:text-teal-800 transition-colors">
                          <TruckGlyph />
                          {o.tracking_code && <span className="tabular-nums">{o.tracking_code}</span>}
                        </a>
                      ) : (o.status === 'delivered' || o.production_state === 'delivered') ? (
                        <span title={t('dispatch_done')} className="inline-flex text-emerald-600">
                          <TruckGlyph />
                        </span>
                      ) : (
                        (isAdmin && showDispatch) ? <DispatchDays o={o} t={t} /> : <span className="text-stone-300">—</span>
                      )}
                    </td>
                    {/* PDF */}
                    <td className="px-2.5 py-3">
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
                    {/* Actions — own orders only (repeat/delete). Admin cancel moved
                        into the order detail view. The server re-checks permissions. */}
                    <td className="px-2 py-3">
                      {!isStock && currentUserId && o.user_id === currentUserId ? (
                      <div className="flex items-center gap-0.5">
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
                      {/* Delete — own order, only while Piedro hasn't acted (server re-checks) */}
                      {clientCanDelete(o) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(o.id) }}
                          disabled={deleting === o.id}
                          title={t('delete_order')}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg
                                     text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors
                                     disabled:opacity-40">
                          {deleting === o.id ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                            </svg>
                          )}
                        </button>
                      )}
                      </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky pagination footer. First order shown on page p → its date (the sort
          is descending, so page 1 is newest, the last page oldest) as a hover hint. */}
      <ListPager
        page={page}
        total={Math.ceil(filtered.length / PER_PAGE)}
        onPage={setPage}
        pageLabel={p => {
          const o = filtered[(p - 1) * PER_PAGE]
          return o?.created_at
            ? new Date(o.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
            : undefined
        }}
      />

      {/* Quick top/bottom + sideways nav. Lifted above the chat bubble (bottom-6
          right-6) so the two don't overlap. */}
      <GridFloatingNav scrollRef={scrollRef} position="bottom-24 right-6" />
    </div>
  )
}
