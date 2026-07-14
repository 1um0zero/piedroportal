import { getLocale, getTranslations } from 'next-intl/server'
import { productImageUrl } from '@/lib/products/image-url'
import { createServiceClient } from '@/lib/supabase/service'
import { requireBackofficePage } from '@/lib/admin/scope'
import { nz } from '@/lib/format'
import { PeriodFilter } from './PeriodFilter'


const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-stone-300', submitted: 'bg-blue-400', approved: 'bg-emerald-400',
  in_production: 'bg-amber-400', shipped: 'bg-violet-400', delivered: 'bg-teal-400', cancelled: 'bg-red-300',
}
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-500', submitted: 'bg-blue-50 text-blue-600',
  approved: 'bg-green-50 text-green-600', in_production: 'bg-amber-50 text-amber-600',
  shipped: 'bg-purple-50 text-purple-600', delivered: 'bg-teal-50 text-teal-600',
  cancelled: 'bg-red-50 text-red-400',
}
const FLAG: Record<string, string> = {
  NL:'🇳🇱', BE:'🇧🇪', DE:'🇩🇪', FR:'🇫🇷', GB:'🇬🇧', PT:'🇵🇹', ES:'🇪🇸',
  IT:'🇮🇹', AT:'🇦🇹', CH:'🇨🇭', DK:'🇩🇰', SE:'🇸🇪', NO:'🇳🇴', FI:'🇫🇮',
  LU:'🇱🇺', PL:'🇵🇱', CZ:'🇨🇿', HU:'🇭🇺', RO:'🇷🇴', US:'🇺🇸',
}

function countAdditions(adds: Record<string, unknown> | null): number {
  if (!adds) return 0
  let n = 0
  for (const v of Object.values(adds)) {
    if (v === null || v === undefined || v === '' || v === false) continue
    if (typeof v === 'boolean') { n++; continue }
    const sv = v as { l: unknown; r: unknown }
    if (sv?.l != null && sv.l !== '' && sv.l !== false) n++
    if (sv?.r != null && sv.r !== '' && sv.r !== false) n++
  }
  return n
}

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

function VBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs font-semibold text-stone-600">{count || ''}</span>
      <div className="w-full bg-stone-100 rounded-t flex flex-col justify-end" style={{ height: 80 }}>
        <div className="w-full bg-gold rounded-t" style={{ height: `${pct}%`, minHeight: count > 0 ? 4 : 0 }} />
      </div>
      <span className="text-[10px] text-stone-400">{label}</span>
    </div>
  )
}

function StatCard({ label, value, color = 'text-stone-800', sub }: { label: string; value: number; color?: string; sub?: string }) {
  return (
    <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{nz(value)}</p>
      {sub && <p className="text-[10px] text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const scope = await requireBackofficePage()
  const locale = await getLocale()
  const td = await getTranslations('dashboard')
  const tg = await getTranslations('gallery')
  const statusLabel = (st: string) => (td.has(`status.${st}`) ? td(`status.${st}`) : st)

  const service = createServiceClient()
  const SELECT = `id, status, unit, patient_name, reference_customer, created_at, additions,
    products(id, colour_id, color_name, style_name, picture_name, section),
    companies(id, name, country)`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allOrders: any[] = []
  let offset = 0
  while (true) {
    const { data, error } = await service
      .from('orders').select(SELECT)
      .order('created_at', { ascending: false })
      .range(offset, offset + 999)
    if (error || !data?.length) break
    allOrders = allOrders.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }

  // Branch staff dashboards are scoped to the models they manage and their client portfolio.
  if (!scope.allModels) allOrders = allOrders.filter(o => scope.canModel(o.products?.style_name) && scope.canCompany(o.companies?.id))

  // ── Period filter ─────────────────────────────────────────────────────────
  // A `YYYY-MM` range (?from&?to) scopes every KPI and breakdown below. The two
  // relative "trend" widgets (daily last-4-weeks, monthly last-6-months) keep
  // running over the full set — they are recent-activity windows by definition.
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const clampMonth = (m: string | undefined, lo: string, hi: string) =>
    m && /^\d{4}-\d{2}$/.test(m) ? (m < lo ? lo : m > hi ? hi : m) : undefined
  const nowM = monthKey(new Date())
  // allOrders is sorted created_at desc, so the last row is the oldest order.
  const minMonth = allOrders.length ? monthKey(new Date(allOrders[allOrders.length - 1].created_at)) : nowM
  const maxMonth = nowM > minMonth ? nowM : minMonth
  const { from: fromRaw, to: toRaw } = await searchParams
  let fromM = clampMonth(fromRaw, minMonth, maxMonth) ?? minMonth
  let toM   = clampMonth(toRaw,   minMonth, maxMonth) ?? maxMonth
  if (fromM > toM) [fromM, toM] = [toM, fromM]
  const all = allOrders.filter(o => { const k = monthKey(new Date(o.created_at)); return k >= fromM && k <= toM })

  const total   = all.length
  const urgent  = all.filter(o => (o.additions as Record<string,unknown>)?.urgent === true).length
  const bySt: Record<string, number> = {}
  all.forEach(o => { bySt[o.status] = (bySt[o.status] ?? 0) + 1 })

  // ── Best clients ──────────────────────────────────────────────────────────
  const clientMap = new Map<string, { count: number; submitted: number }>()
  all.forEach(o => {
    const n = o.companies?.name ?? '—'
    const cur = clientMap.get(n) ?? { count: 0, submitted: 0 }
    clientMap.set(n, { count: cur.count + 1, submitted: cur.submitted + (o.status !== 'draft' ? 1 : 0) })
  })
  const topClients = [...clientMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count).slice(0, 8)

  // ── Models grouped by style_name, colors with photos — split by section ───
  type ColorEntry = { count: number; picture_name: string; colour_id: string; color_name: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const computeTopStyles = (orders: any[]) => {
    const styleMap = new Map<string, { total: number; colors: Map<string, ColorEntry> }>()
    orders.forEach(o => {
      if (!o.products) return
      const style = o.products.style_name ?? '—'
      if (!styleMap.has(style)) styleMap.set(style, { total: 0, colors: new Map() })
      const sd = styleMap.get(style)!
      sd.total++
      const cid = o.products.colour_id
      const cc = sd.colors.get(cid) ?? { count: 0, picture_name: o.products.picture_name ?? '', colour_id: cid, color_name: o.products.color_name ?? '' }
      cc.count++
      sd.colors.set(cid, cc)
    })
    const styles = [...styleMap.entries()]
      .map(([style, d]) => ({ style, total: d.total, colors: [...d.colors.values()].sort((a, b) => b.count - a.count) }))
      .sort((a, b) => b.total - a.total).slice(0, 8)
    return { styles, max: styles[0]?.total ?? 1 }
  }
  const GENDER_SECTIONS: { key: 'KIDS' | 'MEN' | 'WOMEN'; label: string }[] = [
    { key: 'KIDS',  label: tg('kids') },
    { key: 'MEN',   label: tg('men') },
    { key: 'WOMEN', label: tg('women') },
  ]
  const stylesBySection = GENDER_SECTIONS
    .map(g => ({ ...g, ...computeTopStyles(all.filter(o => o.products?.section === g.key)) }))
    .filter(g => g.styles.length > 0)

  // ── Countries ─────────────────────────────────────────────────────────────
  const countryMap = new Map<string, number>()
  all.forEach(o => {
    const c = o.companies?.country?.toUpperCase() ?? null
    if (c) countryMap.set(c, (countryMap.get(c) ?? 0) + 1)
  })
  const topCountries = [...countryMap.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
  const countryMax = topCountries[0]?.count ?? 1
  const hasCountries = topCountries.length > 0

  // ── Additions ─────────────────────────────────────────────────────────────
  const addsMap = new Map<string, number>()
  all.forEach(o => {
    const n = o.companies?.name ?? '—'
    addsMap.set(n, (addsMap.get(n) ?? 0) + countAdditions(o.additions as Record<string, unknown> | null))
  })
  const topAdds = [...addsMap.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 6)
  const addsMax = topAdds[0]?.total ?? 1

  const fieldCounts = new Map<string, number>()
  all.forEach(o => {
    const adds = o.additions as Record<string, unknown> | null
    if (!adds) return
    Object.entries(adds).forEach(([key, v]) => {
      if (v === null || v === undefined || v === false || v === '') return
      if (typeof v === 'boolean') { fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1); return }
      const sv = v as { l: unknown; r: unknown }
      if ((sv.l != null && sv.l !== '' && sv.l !== false) || (sv.r != null && sv.r !== '' && sv.r !== false))
        fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1)
    })
  })
  const topFields = [...fieldCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([key, count]) => ({ key, label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), count }))

  // ── Monthly trend ─────────────────────────────────────────────────────────
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      label: d.toLocaleString(locale, { month: 'short' }),
      count: allOrders.filter(o => { const od = new Date(o.created_at); return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth() }).length,
    }
  })
  const monthMax = Math.max(...months.map(m => m.count), 1)

  // ── Daily trend — last 4 weeks, every status, to reveal weekday patterns ──
  const DAY_MS = 86_400_000
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  const dailyCount = new Map<string, number>()
  allOrders.forEach(o => {
    const k = dayKey(new Date(o.created_at))
    dailyCount.set(k, (dailyCount.get(k) ?? 0) + 1)
  })
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today.getTime() - (27 - i) * DAY_MS)
    return {
      date: d,
      dow: d.getDay(), // 0 = Sunday
      weekend: d.getDay() === 0 || d.getDay() === 6,
      count: dailyCount.get(dayKey(d)) ?? 0,
    }
  })
  const dailyMax = Math.max(...days.map(d => d.count), 1)
  // Average per weekday (Mon→Sun); 28 days = exactly 4 of each weekday
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
  const weekdayAvg = WEEK_ORDER.map(dow => {
    const sample = days.filter(d => d.dow === dow)
    const sum = sample.reduce((a, d) => a + d.count, 0)
    return {
      dow,
      label: new Date(2024, 0, 7 + dow).toLocaleDateString(locale, { weekday: 'short' }),
      avg: sample.length ? sum / sample.length : 0,
      weekend: dow === 0 || dow === 6,
    }
  })
  const weekdayMax = Math.max(...weekdayAvg.map(w => w.avg), 1)
  // SVG line geometry
  const CW = 700, CH = 150, PAD_T = 12, PAD_B = 22, PAD_X = 8
  const plotW = CW - PAD_X * 2, plotH = CH - PAD_T - PAD_B
  const xAt = (i: number) => PAD_X + (days.length === 1 ? plotW / 2 : (i / (days.length - 1)) * plotW)
  const yAt = (v: number) => PAD_T + plotH - (v / dailyMax) * plotH
  const linePts = days.map((d, i) => `${xAt(i).toFixed(1)},${yAt(d.count).toFixed(1)}`).join(' ')
  const areaPts = `${PAD_X},${PAD_T + plotH} ${linePts} ${(PAD_X + plotW).toFixed(1)},${(PAD_T + plotH).toFixed(1)}`

  const recent = all.filter(o => o.status !== 'draft').slice(0, 8)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-stone-900">{td('admin.title')}</h1>
        <p className="text-xs text-stone-400">{td('subtitle', { count: total, date: new Date().toLocaleDateString(locale, { day:'2-digit', month:'long', year:'numeric' }) })}</p>
      </div>

      {/* Period filter — scopes the KPIs and breakdowns below */}
      <PeriodFilter min={minMonth} max={maxMonth} from={fromM} to={toM} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label={td('kpi.total')}          value={total}                   />
        <StatCard label={statusLabel('draft')}     value={bySt.draft        ?? 0} color="text-stone-500" />
        <StatCard label={statusLabel('submitted')} value={bySt.submitted    ?? 0} color="text-blue-600"  />
        <StatCard label={statusLabel('approved')}  value={bySt.approved     ?? 0} color="text-emerald-600" />
        <StatCard label={statusLabel('in_production')} value={bySt.in_production ?? 0} color="text-amber-600" />
        <StatCard label={statusLabel('delivered')} value={bySt.delivered    ?? 0} color="text-teal-600" />
        <StatCard label={`🔴 ${td('kpi.urgent')}`} value={urgent}                  color="text-red-500"  />
      </div>

      {/* Daily trend — last 4 weeks, all statuses, to reveal weekday patterns */}
      <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{td('sections.daily_trend')}</h2>
          <span className="text-[10px] text-stone-300">{td('sections.daily_trend_hint')}</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
          {/* Line chart */}
          <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full h-auto" role="img"
            aria-label={td('sections.daily_trend')}>
            <defs>
              <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B8975A" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#B8975A" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* weekend bands */}
            {days.map((d, i) => d.weekend ? (
              <rect key={`w${i}`} x={xAt(i) - plotW / (days.length - 1) / 2} y={PAD_T}
                width={plotW / (days.length - 1)} height={plotH} fill="#000" opacity="0.025" />
            ) : null)}
            {/* week separators (every Monday) */}
            {days.map((d, i) => d.dow === 1 && i > 0 ? (
              <line key={`s${i}`} x1={xAt(i) - plotW / (days.length - 1) / 2} y1={PAD_T}
                x2={xAt(i) - plotW / (days.length - 1) / 2} y2={PAD_T + plotH}
                stroke="#e7e5e4" strokeWidth="1" strokeDasharray="3 3" />
            ) : null)}
            {/* area + line */}
            <polygon points={areaPts} fill="url(#dailyFill)" />
            <polyline points={linePts} fill="none" stroke="#B8975A" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" />
            {/* dots + count labels + weekday initials */}
            {days.map((d, i) => (
              <g key={`p${i}`}>
                <circle cx={xAt(i)} cy={yAt(d.count)} r={d.count > 0 ? 2.5 : 1.5}
                  fill={d.weekend ? '#a8a29e' : '#B8975A'} />
                {d.count > 0 && (
                  <text x={xAt(i)} y={yAt(d.count) - 6} textAnchor="middle"
                    fontSize="9" fill="#78716c" fontWeight="600">{d.count}</text>
                )}
                <text x={xAt(i)} y={CH - 8} textAnchor="middle" fontSize="8"
                  fill={d.weekend ? '#d6d3d1' : '#a8a29e'}>
                  {d.date.toLocaleDateString(locale, { weekday: 'narrow' })}
                </text>
              </g>
            ))}
          </svg>
          {/* Weekday averages */}
          <div className="lg:w-52">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">{td('sections.weekday_avg')}</p>
            <div className="space-y-1">
              {weekdayAvg.map(w => (
                <div key={w.dow} className="flex items-center gap-2">
                  <span className={`text-[11px] w-8 capitalize ${w.weekend ? 'text-stone-300' : 'text-stone-500'}`}>{w.label}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${w.weekend ? 'bg-stone-300' : 'bg-gold'}`}
                      style={{ width: `${Math.round((w.avg / weekdayMax) * 100)}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-stone-600 w-7 text-right tabular-nums">{w.avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Best clients + Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{td('admin.best_clients')}</h2>
          <div className="space-y-0.5">
            {topClients.map(c => (
              <Bar key={c.name} label={c.name} count={c.count} max={topClients[0]?.count ?? 1}
                sub={td('admin.submitted_count', { n: c.submitted })} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{td('admin.by_country')}</h2>
          {hasCountries ? (
            <div className="space-y-1.5">
              {topCountries.map(c => (
                <div key={c.code} className="flex items-center gap-3 py-1">
                  <span className="text-xl w-8 text-center shrink-0">{FLAG[c.code] ?? '🏳️'}</span>
                  <span className="text-sm font-medium text-stone-700 w-8">{c.code}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-2">
                    <div className="bg-gold h-2 rounded-full" style={{ width: `${Math.round((c.count / countryMax) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-bold text-stone-700 w-8 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <p className="text-sm text-stone-400">{td('admin.no_country_data')}</p>
              <p className="text-xs text-stone-300">{td('admin.no_country_hint')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Models by style_name with color thumbnails — split by gender section */}
      <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-5">{td('sections.top_models')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
          {stylesBySection.map(group => (
            <div key={group.key}>
              <h3 className="text-[11px] font-bold text-gold uppercase tracking-wider mb-4 pb-2 border-b border-stone-100">{group.label}</h3>
              <div className="space-y-5">
                {group.styles.map(s => (
                  <div key={s.style}>
                    {/* Model header with bar */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-stone-800 w-16 shrink-0">{s.style}</span>
                      <div className="flex-1 bg-stone-100 rounded-full h-2">
                        <div className="bg-gold h-2 rounded-full" style={{ width: `${Math.round((s.total / group.max) * 100)}%` }} />
                      </div>
                      <span className="text-lg font-bold text-gold w-10 text-right shrink-0">{s.total}</span>
                    </div>
                    {/* Color swatches with photos and count badge */}
                    <div className="flex gap-2 flex-wrap">
                      {s.colors.map(c => (
                        <div key={c.colour_id} className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 border border-stone-100 group"
                          title={`${c.colour_id} — ${c.color_name}`}>
                          {c.picture_name ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={productImageUrl(c.picture_name)} alt={c.colour_id}
                              className="w-full h-full object-contain p-1" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[8px] text-stone-400 text-center px-0.5 leading-tight">{c.colour_id}</span>
                            </div>
                          )}
                          {/* Count badge */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent pt-2 pb-0.5 flex items-end justify-center">
                            <span className="text-white text-[10px] font-bold">{c.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additions + Monthly trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{td('admin.clients_most_additions')}</h2>
          <div className="space-y-0.5 mb-5">
            {topAdds.map(a => <Bar key={a.name} label={a.name} count={a.total} max={addsMax} sub={td('admin.fields_filled')} />)}
          </div>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">{td('admin.common_additions')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {topFields.map(f => (
              <div key={f.key} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                <span className="text-xs text-stone-600 truncate">{f.label}</span>
                <span className="text-xs font-bold text-gold ml-2 shrink-0">{f.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{td('sections.monthly_trend')}</h2>
          <div className="flex items-end gap-2 px-2 mb-6">
            {months.map(m => <VBar key={m.label} label={m.label} count={m.count} max={monthMax} />)}
          </div>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">{td('sections.by_status')}</h2>
          <div className="space-y-2">
            {Object.entries(bySt)
              .sort((a, b) => {
                const ord = ['submitted','approved','in_production','shipped','delivered','draft','cancelled']
                return ord.indexOf(a[0]) - ord.indexOf(b[0])
              })
              .map(([st, n]) => (
                <div key={st} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLOR[st] ?? 'bg-stone-300'}`} />
                  <span className="text-xs text-stone-600 flex-1">{statusLabel(st)}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${STATUS_COLOR[st] ?? 'bg-stone-300'}`}
                      style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold text-stone-600 w-6 text-right">{n}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{td('admin.recent_activity')}</h2>
        </div>
        <div className="divide-y divide-stone-50">
          {recent.map(o => (
            <div key={o.id} className="flex items-center gap-4 px-6 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{o.companies?.name ?? '—'}</p>
                <p className="text-xs text-stone-400">
                  {o.products?.colour_id ?? '—'} · {o.patient_name ?? o.reference_customer ?? '—'}
                </p>
              </div>
              <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[o.status] ?? 'bg-stone-100 text-stone-500'}`}>
                {statusLabel(o.status)}
              </span>
              <span className="shrink-0 text-xs text-stone-400 whitespace-nowrap">
                {new Date(o.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
