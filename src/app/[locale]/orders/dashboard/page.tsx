import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Link } from '@/i18n/navigation'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`

const STATUS_LABEL: Record<string, string> = {
  draft:'Draft', submitted:'Submitted', approved:'Approved',
  in_production:'In Production', shipped:'Shipped', delivered:'Delivered', cancelled:'Cancelled',
}
const STATUS_COLOR: Record<string, string> = {
  draft:'bg-stone-300', submitted:'bg-blue-400', approved:'bg-emerald-400',
  in_production:'bg-amber-400', shipped:'bg-violet-400', delivered:'bg-teal-400', cancelled:'bg-red-300',
}
const STATUS_BADGE: Record<string, string> = {
  draft:'bg-stone-100 text-stone-500', submitted:'bg-blue-50 text-blue-600',
  approved:'bg-green-50 text-green-600', in_production:'bg-amber-50 text-amber-600',
  shipped:'bg-purple-50 text-purple-600', delivered:'bg-teal-50 text-teal-600',
  cancelled:'bg-red-50 text-red-400',
}

function StatCard({ label, value, color = 'text-stone-800' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function VBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs font-semibold text-stone-600">{count || ''}</span>
      <div className="w-full bg-stone-100 rounded-t flex flex-col justify-end" style={{ height: 72 }}>
        <div className="w-full bg-gold rounded-t" style={{ height: `${pct}%`, minHeight: count > 0 ? 3 : 0 }} />
      </div>
      <span className="text-[10px] text-stone-400">{label}</span>
    </div>
  )
}

export default async function ClientDashboard() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await sb
    .from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/orders')
  if (profile.role === 'piedro_admin') redirect('/admin')

  const service = createServiceClient()
  const { data: all } = await service
    .from('orders')
    .select(`id, status, unit, patient_name, reference_customer, created_at, additions, pdf_url,
      products(id, colour_id, color_name, style_name, picture_name)`)
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  const orders = all ?? []
  const total = orders.length
  const bySt: Record<string, number> = {}
  orders.forEach(o => { bySt[o.status] = (bySt[o.status] ?? 0) + 1 })

  // Top models this company ordered
  type Prod = { id: string; colour_id: string; color_name: string; style_name: string; picture_name: string }
  type ModelEntry = { total: number; picture_name: string; color_name: string }
  const modelMap = new Map<string, ModelEntry>()
  orders.forEach(o => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (Array.isArray(o.products) ? o.products[0] : o.products) as Prod | null
    if (!p) return
    const id = p.colour_id
    const cur = modelMap.get(id) ?? { total: 0, picture_name: p.picture_name ?? '', color_name: p.color_name ?? '' }
    modelMap.set(id, { ...cur, total: cur.total + 1 })
  })
  const topModels = [...modelMap.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total).slice(0, 6)

  // Monthly trend (last 6 months)
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      label: d.toLocaleString('pt-PT', { month: 'short' }),
      count: orders.filter(o => {
        const od = new Date(o.created_at)
        return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth()
      }).length,
    }
  })
  const monthMax = Math.max(...months.map(m => m.count), 1)

  // Recent 6 orders
  const recent = orders.slice(0, 6)
  // Pending (submitted + approved)
  const pending = orders.filter(o => o.status === 'submitted' || o.status === 'approved').length

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-stone-900">As Minhas Encomendas</h1>
        <Link href="/orders" className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
          Ver lista completa →
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={total} />
        <StatCard label="Pendentes" value={pending} color="text-blue-600" />
        <StatCard label="Em Produção" value={bySt.in_production ?? 0} color="text-amber-600" />
        <StatCard label="Entregues" value={bySt.delivered ?? 0} color="text-emerald-600" />
      </div>

      {/* Top models + Monthly trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top models */}
        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Modelos Mais Pedidos</h2>
          <div className="grid grid-cols-3 gap-3">
            {topModels.map(m => (
              <div key={m.id} className="flex flex-col items-center gap-1.5">
                <div className="relative w-full aspect-square rounded-xl bg-stone-50 border border-stone-100 overflow-hidden">
                  {m.picture_name ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${BUCKET}/${m.picture_name}`} alt={m.id}
                      className="w-full h-full object-contain p-2" />
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

        {/* Monthly trend + status */}
        <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Tendência Mensal</h2>
          <div className="flex items-end gap-2 px-1 mb-6">
            {months.map(m => <VBar key={m.label} label={m.label} count={m.count} max={monthMax} />)}
          </div>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Por Estado</h2>
          <div className="space-y-2">
            {Object.entries(bySt)
              .sort((a, b) => b[1] - a[1])
              .map(([st, n]) => (
                <div key={st} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLOR[st] ?? 'bg-stone-300'}`} />
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

      {/* Recent orders */}
      <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Últimas Encomendas</h2>
          <Link href="/orders" className="text-xs text-gold hover:underline">Ver todas</Link>
        </div>
        <div className="divide-y divide-stone-50">
          {recent.map(o => {
            const p = (Array.isArray(o.products) ? o.products[0] : o.products) as Prod | null
            return (
              <div key={o.id} className="flex items-center gap-4 px-6 py-3">
                {p?.picture_name && (
                  <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-100 shrink-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${BUCKET}/${p.picture_name}`} alt="" className="w-full h-full object-contain p-1" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{p?.colour_id ?? '—'}</p>
                  <p className="text-xs text-stone-400">{o.patient_name ?? o.reference_customer ?? '—'}</p>
                </div>
                <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[o.status] ?? 'bg-stone-100 text-stone-500'}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
                {o.pdf_url && (
                  <a href={o.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gold hover:bg-gold/10 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
                    </svg>
                  </a>
                )}
                <span className="shrink-0 text-xs text-stone-400 whitespace-nowrap">
                  {new Date(o.created_at).toLocaleDateString('pt-PT', { day:'2-digit', month:'short' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
