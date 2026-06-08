import { createServiceClient } from '@/lib/supabase/service'
import { requireBackofficePage } from '@/lib/admin/scope'
import { signOrderPdfs } from '@/lib/order-pdf'
import OrdersPage from '@/components/orders/OrdersPage'

const SELECT = `
  id, user_id, status, approval_state, production_state, unit, patient_name, reference_customer, quantity,
  created_at, updated_at, size_left, size_right, additions, comments, pdf_url,
  products(id, style_name, colour_id, color_name, closure, picture_name, section),
  companies(id, name, erp_code)
`

// "New" = submitted by the client and not yet touched by staff (the validation queue).
const isNew = (o: { status?: string; approval_state?: string | null }) =>
  o.status === 'submitted' && (!o.approval_state || o.approval_state === 'registered')

export default async function AdminOrdersPage() {
  const scope = await requireBackofficePage()

  const service = createServiceClient()
  let allOrders: any[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service
      .from('orders')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    allOrders = allOrders.concat(data)
    if (data.length < PAGE) break
    offset += PAGE
  }

  // Branch staff only see orders whose product model is within their scope.
  const all = scope.allModels
    ? allOrders
    : allOrders.filter(o => scope.canModel(o.products?.style_name))

  // Replace the stored path with a short-lived signed URL (private bucket).
  const signed = await signOrderPdfs(all.filter(o => o.pdf_url).map(o => o.id))
  all.forEach(o => { o.pdf_url = o.pdf_url ? (signed[o.id] ?? null) : null })

  const metrics = {
    total:      all.length,
    new:        all.filter(isNew).length,
    draft:      all.filter(o => o.status === 'draft').length,
    submitted:  all.filter(o => o.status === 'submitted').length,
    approved:   all.filter(o => o.status === 'approved').length,
    production: all.filter(o => o.status === 'in_production').length,
    urgent:     all.filter(o => (o.additions as any)?.urgent === true).length,
  }

  return <OrdersPage orders={all} metrics={metrics} isAdmin={true} currentUserId={scope.userId} />
}
