import { createServiceClient } from '@/lib/supabase/service'
import { requireBackofficePage } from '@/lib/admin/scope'
import { signOrderPdfs } from '@/lib/order-pdf'
import { attachOrderExtras } from '@/lib/order-tracking'
import { getStockOrderRows } from '@/app/actions/stock'
import OrdersPage from '@/components/orders/OrdersPage'

const SELECT = `
  id, user_id, dataverse_id, order_seq, status, approval_state, production_state, piedro_order_id, unit, patient_name, clinician, reference_customer, quantity,
  created_at, updated_at, size_left, size_right, additions, comments, pdf_url,
  products(id, style_name, colour_id, color_name, closure, picture_name, section),
  companies(id, name, erp_code)
`

// Age window keeps the default fetch small (most orders are historical/migrated).
const AGE_MONTHS: Record<string, number> = { '3m': 3, '6m': 6, '12m': 12 }
function ageCutoff(age: string): string | null {
  const months = AGE_MONTHS[age]
  if (!months) return null // 'all'
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString()
}

type Props = { searchParams: Promise<{ age?: string; from?: string; to?: string }> }

export default async function AdminOrdersPage({ searchParams }: Props) {
  const scope = await requireBackofficePage()
  const sp = await searchParams
  const age = sp.age ?? '3m'
  // A specific from–to period (both required) overrides the quick age window.
  const useRange = !!(sp.from && sp.to)
  const cutoff = useRange ? null : ageCutoff(age)

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allOrders: any[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    let q = service
      .from('orders')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)
    if (useRange) q = q.gte('created_at', `${sp.from}T00:00:00`).lte('created_at', `${sp.to}T23:59:59`)
    else if (cutoff) q = q.gte('created_at', cutoff)
    const { data, error } = await q
    if (error || !data?.length) break
    allOrders = allOrders.concat(data)
    if (data.length < PAGE) break
    offset += PAGE
  }

  // Branch staff only see orders whose product model is within their scope.
  const scopedOrders = scope.allModels
    ? allOrders
    : allOrders.filter(o => scope.canModel(o.products?.style_name))

  // STOCK orders (separate table), under the same scoping as configured orders:
  // a stock order is in scope if ANY of its models is in the staff member's scope.
  const allStock = await getStockOrderRows({
    all: true,
    fromISO: useRange ? `${sp.from}T00:00:00` : undefined,
    toISO: useRange ? `${sp.to}T23:59:59` : undefined,
    cutoffISO: cutoff,
  })
  const stockRows = scope.allModels
    ? allStock
    : allStock.filter(o => o.styleNames.some(sn => scope.canModel(sn)))

  const all = [...scopedOrders, ...stockRows].sort(
    (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''),
  )

  await attachOrderExtras(all, service)

  // Replace the stored path with a short-lived signed URL (private bucket).
  const signed = await signOrderPdfs(all.filter(o => o.pdf_url).map(o => o.id))
  all.forEach(o => { o.pdf_url = o.pdf_url ? (signed[o.id] ?? null) : null })

  return <OrdersPage orders={all} isAdmin={true} canSeeClinician={true} currentUserId={scope.userId} age={age} from={sp.from} to={sp.to} showDispatch={true} />
}
