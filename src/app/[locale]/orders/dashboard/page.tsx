import { redirect } from 'next/navigation'
import { productImageUrl } from '@/lib/products/image-url'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasAnyCompany, getAdminCompanyIds } from '@/lib/user-companies'
import { signOrderPdfs } from '@/lib/order-pdf'
import { Link } from '@/i18n/navigation'
import { nz } from '@/lib/format'
import { isPiedroAdmin } from '@/lib/roles'
import { fetchAll } from '@/lib/fetch-all'


const STATUS_DOT: Record<string, string> = {
  draft: 'bg-stone-300', submitted: 'bg-blue-400', approved: 'bg-emerald-400',
  in_production: 'bg-amber-400', shipped: 'bg-violet-400', delivered: 'bg-teal-400', cancelled: 'bg-red-300',
}
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-500', submitted: 'bg-blue-50 text-blue-600',
  approved: 'bg-green-50 text-green-600', in_production: 'bg-amber-50 text-amber-600',
  shipped: 'bg-purple-50 text-purple-600', delivered: 'bg-teal-50 text-teal-600',
  cancelled: 'bg-red-50 text-red-400',
}
const STATUS_ORDER = ['submitted', 'approved', 'in_production', 'shipped', 'delivered', 'draft', 'cancelled']

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function StatCard({ label, value, color = 'text-stone-800', sub, subColor = 'text-stone-400' }:
  { label: string; value: number; color?: string; sub?: string; subColor?: string }) {
  return (
    <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{nz(value)}</p>
      {sub && <p className={`text-[10px] font-medium mt-0.5 ${subColor}`}>{sub}</p>}
    </div>
  )
}

/** Horizontal labelled bar (used for clients/models/additions/members). */
function Bar({ label, count, max, sub }: { label: string; count: number; max: number; sub?: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-36 min-w-0">
        <p className="text-sm font-medium text-stone-700 truncate">{label}</p>
        {sub && <p className="text-[10px] text-stone-400 truncate">{sub}</p>}
      </div>
      <div className="flex-1 bg-stone-100 rounded-full h-2">
        <div className="bg-gold h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-stone-700 w-8 text-right shrink-0">{nz(count)}</span>
    </div>
  )
}

/** Vertical bar (monthly trend + size histogram). */
function VBar({ label, count, max, height = 80 }: { label: string; count: number; max: number; height?: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-[10px] font-semibold text-stone-600 h-3">{count || ''}</span>
      <div className="w-full bg-stone-100 rounded-t flex flex-col justify-end" style={{ height }}>
        <div className="w-full bg-gold rounded-t" style={{ height: `${pct}%`, minHeight: count > 0 ? 3 : 0 }} />
      </div>
      <span className="text-[10px] text-stone-400 truncate w-full text-center">{label}</span>
    </div>
  )
}

export default async function ClientDashboard() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (isPiedroAdmin(profile?.role)) redirect('/admin')

  // Membership comes from user_companies, not the deprecated profiles.company_id
  const userHasCompany = await hasAnyCompany(user.id)
  if (!userHasCompany) redirect('/orders')

  const adminCompanyIds = await getAdminCompanyIds(user.id)
  const isCompanyAdmin = adminCompanyIds.length > 0

  const locale = await getLocale()
  const td = await getTranslations('dashboard')
  const ta = await getTranslations('additions')
  const statusLabel = (st: string) => (td.has(`status.${st}`) ? td(`status.${st}`) : st)

  const service = createServiceClient()
  const SELECT = `id, status, unit, quantity, patient_name, reference_customer, created_at,
      size_left, size_right, additions, pdf_url, user_id, company_id,
      products(id, colour_id, color_name, style_name, picture_name, section, closure),
      companies(id, name)`
  // Paginated: every KPI below is computed over this array — a truncated fetch
  // silently under-reports all dashboard numbers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = await fetchAll<any>(page => {
    let query = service.from('orders').select(SELECT)
    // Company admins see all orders from companies they admin; regular users see their own
    if (isCompanyAdmin) query = query.in('company_id', adminCompanyIds)
    else query = query.eq('user_id', user.id)
    return query.order('created_at', { ascending: false }).range(page.from, page.to)
  })
  const total = orders.length
  const prod = (o: { products: unknown }) =>
    (Array.isArray(o.products) ? o.products[0] : o.products) as
    { id: string; colour_id: string; color_name: string; style_name: string; picture_name: string; section: string; closure: string } | null

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (total === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-xl font-bold text-stone-900">{isCompanyAdmin ? td('title_company') : td('title_user')}</h1>
        <div className="bg-white rounded-[14px] p-16 flex flex-col items-center text-center gap-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-stone-800">{td('empty')}</h2>
          <p className="text-sm text-stone-500 max-w-sm">{td('empty_desc')}</p>
          <Link href="/gallery" className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold text-white text-sm font-medium hover:bg-gold-dark transition-colors">
            {td('cta_new_order')} →
          </Link>
        </div>
      </div>
    )
  }

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const bySt: Record<string, number> = {}
  orders.forEach(o => { bySt[o.status] = (bySt[o.status] ?? 0) + 1 })
  const pending = (bySt.submitted ?? 0) + (bySt.approved ?? 0)
  const urgent = orders.filter(o => (o.additions as Record<string, unknown>)?.urgent === true).length

  const now = new Date()
  const inMonth = (o: { created_at: string }, back: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1)
    const od = new Date(o.created_at)
    return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth()
  }
  const thisMonth = orders.filter(o => inMonth(o, 0)).length
  const lastMonth = orders.filter(o => inMonth(o, 1)).length
  const delta = thisMonth - lastMonth
  const deltaStr = delta !== 0
    ? td('delta', { sign: delta > 0 ? '+' : '', n: delta })
    : undefined

  // ── Top models (by colour variant, with photo) ──────────────────────────────
  const modelMap = new Map<string, { total: number; picture_name: string; color_name: string }>()
  orders.forEach(o => {
    const p = prod(o); if (!p) return
    const cur = modelMap.get(p.colour_id) ?? { total: 0, picture_name: p.picture_name ?? '', color_name: p.color_name ?? '' }
    modelMap.set(p.colour_id, { ...cur, total: cur.total + 1 })
  })
  const topModels = [...modelMap.entries()].map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total).slice(0, 6)

  // ── Category (KIDS/MEN/WOMEN) + closure split ───────────────────────────────
  const catMap = new Map<string, number>()
  const closeMap = new Map<string, number>()
  orders.forEach(o => {
    const p = prod(o); if (!p) return
    if (p.section) catMap.set(p.section, (catMap.get(p.section) ?? 0) + 1)
    if (p.closure) closeMap.set(p.closure, (closeMap.get(p.closure) ?? 0) + 1)
  })
  const catRows = [...catMap.entries()].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n)
  const closeRows = [...closeMap.entries()].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n).slice(0, 6)
  const catMax = Math.max(...catRows.map(r => r.n), 1)
  const closeMax = Math.max(...closeRows.map(r => r.n), 1)

  // ── Size distribution histogram ─────────────────────────────────────────────
  const sizeMap = new Map<number, number>()
  orders.forEach(o => {
    for (const raw of [o.size_left, o.size_right]) {
      const n = Math.round(Number(raw))
      if (raw != null && raw !== '' && Number.isFinite(n)) sizeMap.set(n, (sizeMap.get(n) ?? 0) + 1)
    }
  })
  const sizeKeys = [...sizeMap.keys()].sort((a, b) => a - b)
  const sizeMin = sizeKeys[0]
  const sizeMax = sizeKeys[sizeKeys.length - 1]
  const sizeBars = sizeKeys.length
    ? Array.from({ length: sizeMax - sizeMin + 1 }, (_, i) => ({ size: sizeMin + i, count: sizeMap.get(sizeMin + i) ?? 0 }))
    : []
  const sizeCntMax = Math.max(...sizeBars.map(b => b.count), 1)

  // ── Most-used additions (translated labels) ─────────────────────────────────
  const fieldCounts = new Map<string, number>()
  orders.forEach(o => {
    const adds = o.additions as Record<string, unknown> | null
    if (!adds) return
    Object.entries(adds).forEach(([key, v]) => {
      if (v === null || v === undefined || v === false || v === '') return
      if (typeof v === 'boolean') { fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1); return }
      const sv = v as { l?: unknown; r?: unknown }
      if ((sv.l != null && sv.l !== '' && sv.l !== false) || (sv.r != null && sv.r !== '' && sv.r !== false))
        fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1)
    })
  })
  const topFields = [...fieldCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([key, count]) => ({
      key, count,
      label: ta.has(`field_labels.${key}`) ? ta(`field_labels.${key}`) : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    }))
  const fieldMax = topFields[0]?.count ?? 1

  // ── Monthly trend (last 6 months, active-locale month labels) ───────────────
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString(locale, { month: 'short' }),
      count: orders.filter(o => { const od = new Date(o.created_at); return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth() }).length,
    }
  })
  const monthMax = Math.max(...months.map(m => m.count), 1)

  // ── Company-admin extras: by company (if multi) + by team member ────────────
  let byCompany: { name: string; n: number }[] = []
  let byMember: { name: string; n: number }[] = []
  if (isCompanyAdmin) {
    if (adminCompanyIds.length > 1) {
      const cMap = new Map<string, number>()
      orders.forEach(o => {
        const c = (Array.isArray(o.companies) ? o.companies[0] : o.companies) as { name?: string } | null
        const name = c?.name ?? '—'
        cMap.set(name, (cMap.get(name) ?? 0) + 1)
      })
      byCompany = [...cMap.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 8)
    }
    const memberIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))]
    if (memberIds.length > 1) {
      const { data: profs } = await service.from('profiles').select('id, full_name, email').in('id', memberIds)
      const nameOf: Record<string, string> = {}
      profs?.forEach(p => { nameOf[p.id] = p.full_name || p.email || '—' })
      const mMap = new Map<string, number>()
      orders.forEach(o => {
        const name = nameOf[o.user_id] ?? '—'
        mMap.set(name, (mMap.get(name) ?? 0) + 1)
      })
      byMember = [...mMap.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 8)
    }
  }

  // ── Recent orders (sign PDFs for just these) ────────────────────────────────
  const recent = orders.slice(0, 6)
  const signed = await signOrderPdfs(recent.filter(o => o.pdf_url).map(o => o.id))
  recent.forEach(o => { o.pdf_url = o.pdf_url ? (signed[o.id] ?? null) : null })

  const dateStr = new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{isCompanyAdmin ? td('title_company') : td('title_user')}</h1>
          <p className="text-xs text-stone-400 mt-0.5">{td('subtitle', { count: total, date: dateStr })}</p>
        </div>
        <Link href="/orders" className="text-sm text-stone-400 hover:text-stone-700 transition-colors whitespace-nowrap">
          {td('view_all')} →
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label={td('kpi.total')} value={total} />
        <StatCard label={td('kpi.this_month')} value={thisMonth} color="text-gold"
          sub={deltaStr} subColor={delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-red-400' : 'text-stone-400'} />
        <StatCard label={td('kpi.drafts')} value={bySt.draft ?? 0} color="text-stone-500" />
        <StatCard label={td('kpi.pending')} value={pending} color="text-blue-600" />
        <StatCard label={td('kpi.in_production')} value={bySt.in_production ?? 0} color="text-amber-600" />
        <StatCard label={td('kpi.delivered')} value={bySt.delivered ?? 0} color="text-emerald-600" />
        <StatCard label={td('kpi.urgent')} value={urgent} color="text-red-500" />
      </div>

      {/* Monthly trend + status / Top models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{td('sections.monthly_trend')}</h2>
          <div className="flex items-end gap-2 px-1 mb-6">
            {months.map(m => <VBar key={m.key} label={m.label} count={m.count} max={monthMax} />)}
          </div>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">{td('sections.by_status')}</h2>
          <div className="space-y-2">
            {Object.entries(bySt)
              .sort((a, b) => STATUS_ORDER.indexOf(a[0]) - STATUS_ORDER.indexOf(b[0]))
              .map(([st, n]) => (
                <div key={st} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[st] ?? 'bg-stone-300'}`} />
                  <span className="text-xs text-stone-600 flex-1">{statusLabel(st)}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${STATUS_DOT[st] ?? 'bg-stone-300'}`}
                      style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold text-stone-600 w-6 text-right">{n}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{td('sections.top_models')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {topModels.map(m => (
              <div key={m.id} className="flex flex-col items-center gap-1.5">
                <div className="relative w-full aspect-square rounded-xl bg-stone-50 border border-stone-100 overflow-hidden">
                  {m.picture_name ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productImageUrl(m.picture_name)} alt={m.id} className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-stone-400">{m.id}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent pt-3 pb-1 flex items-end justify-center">
                    <span className="text-white text-xs font-bold">{m.total}×</span>
                  </div>
                </div>
                <p className="text-[10px] font-semibold text-stone-700 text-center leading-tight truncate w-full">{m.id}</p>
                <p className="text-[9px] text-stone-400 truncate w-full text-center">{m.color_name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category + closure / Most-used additions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">{td('sections.category_split')}</h2>
          <div className="space-y-0.5 mb-5">
            {catRows.map(r => (
              <Bar key={r.k} label={td.has(`category.${r.k}`) ? td(`category.${r.k}`) : r.k} count={r.n} max={catMax} />
            ))}
          </div>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">{td('sections.closure_split')}</h2>
          <div className="space-y-0.5">
            {closeRows.map(r => <Bar key={r.k} label={titleCase(r.k)} count={r.n} max={closeMax} />)}
          </div>
        </div>

        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">{td('sections.top_additions')}</h2>
          {topFields.length ? (
            <div className="space-y-0.5">
              {topFields.map(f => <Bar key={f.key} label={f.label} count={f.count} max={fieldMax} />)}
            </div>
          ) : (
            <p className="text-sm text-stone-400 py-8 text-center">—</p>
          )}
        </div>
      </div>

      {/* Size distribution */}
      <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">
          {td('sections.size_distribution')} <span className="text-stone-300 normal-case font-medium">· {td('eu_size')}</span>
        </h2>
        {sizeBars.length ? (
          <div className="flex items-end gap-1">
            {sizeBars.map(b => <VBar key={b.size} label={String(b.size)} count={b.count} max={sizeCntMax} height={64} />)}
          </div>
        ) : (
          <p className="text-sm text-stone-400 py-6 text-center">{td('no_size_data')}</p>
        )}
      </div>

      {/* Company-admin extras */}
      {(byCompany.length > 0 || byMember.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {byCompany.length > 0 && (
            <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{td('sections.by_company')}</h2>
              <div className="space-y-0.5">
                {byCompany.map(c => <Bar key={c.name} label={c.name} count={c.n} max={byCompany[0].n} />)}
              </div>
            </div>
          )}
          {byMember.length > 0 && (
            <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{td('sections.by_member')}</h2>
              <div className="space-y-0.5">
                {byMember.map(m => <Bar key={m.name} label={m.name} count={m.n} max={byMember[0].n} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{td('sections.recent_orders')}</h2>
          <Link href="/orders" className="text-xs text-gold hover:underline">{td('view_all_short')}</Link>
        </div>
        <div className="divide-y divide-stone-50">
          {recent.map(o => {
            const p = prod(o)
            return (
              <div key={o.id} className="flex items-center gap-4 px-6 py-3">
                {p?.picture_name && (
                  <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-100 shrink-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={productImageUrl(p.picture_name)} alt="" className="w-full h-full object-contain p-1" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{p?.colour_id ?? '—'}</p>
                  <p className="text-xs text-stone-400 truncate">{o.patient_name ?? o.reference_customer ?? '—'}</p>
                </div>
                <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[o.status] ?? 'bg-stone-100 text-stone-500'}`}>
                  {statusLabel(o.status)}
                </span>
                {o.pdf_url && (
                  <a href={o.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gold hover:bg-gold/10 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </a>
                )}
                <span className="shrink-0 text-xs text-stone-400 whitespace-nowrap">
                  {new Date(o.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
