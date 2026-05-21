import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', approved: 'Approved',
  in_production: 'In Production', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
}
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

// ── Bar chart row ─────────────────────────────────────────────────────────────
function Bar({ label, count, max, sub }: { label: string; count: number; max: number; sub?: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-36 min-w-0">
        <p className="text-sm font-medium text-stone-700 truncate">{label}</p>
        {sub && <p className="text-[10px] text-stone-400 truncate">{sub}</p>}
      </div>
      <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden">
        <div className="bg-gold h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-stone-700 w-8 text-right shrink-0">{count}</span>
    </div>
  )
}

// ── Vertical bar (monthly trend) ──────────────────────────────────────────────
function VBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs font-semibold text-stone-600">{count || ''}</span>
      <div className="w-full bg-stone-100 rounded-t flex flex-col justify-end" style={{ height: 80 }}>
        <div className="w-full bg-gold rounded-t transition-all" style={{ height: `${pct}%`, minHeight: count > 0 ? 4 : 0 }} />
      </div>
      <span className="text-[10px] text-stone-400">{label}</span>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'text-stone-800', sub }: { label: string; value: number; color?: string; sub?: string }) {
  return (
    <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'piedro_admin') redirect('/gallery')

  const service = createServiceClient()
  const SELECT = `id, status, unit, patient_name, reference_customer, created_at, additions,
    products(id, colour_id, color_name, style_name),
    companies(id, name)`

  // Fetch all orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let all: any[] = []
  let offset = 0
  while (true) {
    const { data, error } = await service
      .from('orders').select(SELECT)
      .order('created_at', { ascending: false })
      .range(offset, offset + 999)
    if (error || !data?.length) break
    all = all.concat(data)
    if (data.length < 1000) break
    offset += 1000
  }

  const total = all.length
  const urgent = all.filter(o => (o.additions as Record<string,unknown>)?.urgent === true).length

  // Status counts
  const bySt: Record<string, number> = {}
  all.forEach(o => { bySt[o.status] = (bySt[o.status] ?? 0) + 1 })

  // Top clients by order count
  const clientMap = new Map<string, { count: number; submitted: number }>()
  all.forEach(o => {
    const n = o.companies?.name ?? '—'
    const cur = clientMap.get(n) ?? { count: 0, submitted: 0 }
    clientMap.set(n, {
      count:     cur.count + 1,
      submitted: cur.submitted + (o.status !== 'draft' ? 1 : 0),
    })
  })
  const topClients = [...clientMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count).slice(0, 8)

  // Top models by order count
  const modelMap = new Map<string, { count: number; name: string }>()
  all.forEach(o => {
    if (!o.products) return
    const id = o.products.colour_id
    const cur = modelMap.get(id) ?? { count: 0, name: o.products.color_name ?? '' }
    modelMap.set(id, { count: cur.count + 1, name: cur.name })
  })
  const topModels = [...modelMap.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count).slice(0, 8)

  // Most additions by company
  const addsMap = new Map<string, number>()
  all.forEach(o => {
    const n = o.companies?.name ?? '—'
    const c = countAdditions(o.additions as Record<string, unknown> | null)
    addsMap.set(n, (addsMap.get(n) ?? 0) + c)
  })
  const topAdds = [...addsMap.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total).slice(0, 6)

  // Most common individual additions
  const fieldCounts = new Map<string, number>()
  all.forEach(o => {
    const adds = o.additions as Record<string, unknown> | null
    if (!adds) return
    Object.entries(adds).forEach(([key, v]) => {
      if (v === null || v === undefined || v === false || v === '') return
      if (typeof v === 'boolean') { fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1); return }
      const sv = v as { l: unknown; r: unknown }
      if ((sv.l != null && sv.l !== '' && sv.l !== false) ||
          (sv.r != null && sv.r !== '' && sv.r !== false))
        fieldCounts.set(key, (fieldCounts.get(key) ?? 0) + 1)
    })
  })
  const topFields = [...fieldCounts.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([key, count]) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      count,
    }))

  // Monthly trend (last 6 months)
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = d.toLocaleString('pt-PT', { month: 'short' })
    const count = all.filter(o => {
      const od = new Date(o.created_at)
      return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth()
    }).length
    return { label, count }
  })
  const monthMax = Math.max(...months.map(m => m.count), 1)

  // Recent 8 submitted orders
  const recent = all.filter(o => o.status !== 'draft').slice(0, 8)

  const clientMax = topClients[0]?.count ?? 1
  const modelMax  = topModels[0]?.count ?? 1
  const addsMax   = topAdds[0]?.total ?? 1

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-xs text-stone-400">{total} encomendas no total</p>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Total" value={total} />
        <StatCard label="Draft"        value={bySt.draft        ?? 0} color="text-stone-500" />
        <StatCard label="Submitted"    value={bySt.submitted    ?? 0} color="text-blue-600"  />
        <StatCard label="Approved"     value={bySt.approved     ?? 0} color="text-emerald-600" />
        <StatCard label="Production"   value={bySt.in_production ?? 0} color="text-amber-600" />
        <StatCard label="Shipped"      value={bySt.shipped      ?? 0} color="text-violet-600" />
        <StatCard label="🔴 Urgent"    value={urgent}                  color="text-red-500"   />
      </div>

      {/* ── Row: Best clients + Top models ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Melhores Clientes</h2>
          <div className="space-y-0.5">
            {topClients.map(c => (
              <Bar key={c.name} label={c.name} count={c.count} max={clientMax}
                sub={`${c.submitted} submetidas`} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Modelos Mais Pedidos</h2>
          <div className="space-y-0.5">
            {topModels.map(m => (
              <Bar key={m.id} label={m.id} count={m.count} max={modelMax} sub={m.name} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Row: Additions + Monthly trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Clientes com Mais Adições</h2>
          <div className="space-y-0.5 mb-6">
            {topAdds.map(a => (
              <Bar key={a.name} label={a.name} count={a.total} max={addsMax} sub="campos preenchidos" />
            ))}
          </div>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Adições Mais Comuns</h2>
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
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Tendência Mensal</h2>
          <div className="flex items-end gap-2 px-2">
            {months.map(m => (
              <VBar key={m.label} label={m.label} count={m.count} max={monthMax} />
            ))}
          </div>

          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-6 mb-3">Distribuição por Estado</h2>
          <div className="space-y-2">
            {Object.entries(bySt)
              .sort((a, b) => {
                const order = ['submitted','approved','in_production','shipped','delivered','draft','cancelled']
                return order.indexOf(a[0]) - order.indexOf(b[0])
              })
              .map(([st, n]) => (
                <div key={st} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLOR[st] ?? 'bg-stone-300'}`} />
                  <span className="text-xs text-stone-600 flex-1">{STATUS_LABEL[st] ?? st}</span>
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

      {/* ── Recent activity ── */}
      <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Actividade Recente</h2>
        </div>
        <div className="divide-y divide-stone-50">
          {recent.map(o => (
            <div key={o.id} className="flex items-center gap-4 px-6 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">
                  {o.companies?.name ?? '—'}
                </p>
                <p className="text-xs text-stone-400">
                  {o.products?.colour_id ?? '—'} · {o.patient_name ?? o.reference_customer ?? '—'}
                </p>
              </div>
              <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[o.status] ?? 'bg-stone-100 text-stone-500'}`}>
                {STATUS_LABEL[o.status] ?? o.status}
              </span>
              <span className="shrink-0 text-xs text-stone-400 whitespace-nowrap">
                {new Date(o.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
