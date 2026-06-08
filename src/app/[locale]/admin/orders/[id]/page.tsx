import { notFound, redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireBackofficePage } from '@/lib/admin/scope'
import { signOrderPdf } from '@/lib/order-pdf'
import { getOrderNeighbors } from '@/lib/order-neighbors'
import OrderDetailView from '@/components/order/OrderDetailView'
import { Link } from '@/i18n/navigation'

// Base select — always works
const SELECT_BASE = `id, status, unit, quantity, reference_customer, patient_name, clinician,
  construction_left, construction_right, width_left, width_right, size_left, size_right,
  diff_sizes_pairs, additions, comments, created_at, pdf_url,
  products(id, colour_id, color_name, closure, picture_name, style_name),
  companies(id, name)`

// Extended select — requires SQL migrations to have been run
const SELECT_FULL = `${SELECT_BASE}, piedro_order_id, piedro_notes, approval_state, production_state`

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const scope = await requireBackofficePage()

  const service = createServiceClient()

  // Try full select first; fall back to base if new columns don't exist yet
  let order = null
  const { data: full, error: fullErr } = await service
    .from('orders').select(SELECT_FULL).eq('id', id).single()

  if (fullErr) {
    // Likely missing columns — try base select
    const { data: base } = await service
      .from('orders').select(SELECT_BASE).eq('id', id).single()
    order = base
  } else {
    order = full
  }

  if (!order) notFound()

  // Branch staff cannot open an order whose model is outside their scope.
  const orderStyle = (order as { products?: { style_name?: string } }).products?.style_name
  if (!scope.canModel(orderStyle)) redirect('/admin/orders')

  // Replace the stored path with a short-lived signed URL (private bucket).
  if (order.pdf_url) order.pdf_url = await signOrderPdf(id)

  // Prev/next navigator — only for full-catalogue admins (branch scope is by model,
  // which can't be expressed in a simple neighbour query).
  const { prevId, nextId } = scope.allModels && order.created_at
    ? await getOrderNeighbors(service, { id: order.id, created_at: order.created_at })
    : { prevId: null, nextId: null }

  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          ← All Orders
        </Link>
      </div>
      <OrderDetailView order={order} isAdmin={true} prevId={prevId} nextId={nextId} />
    </div>
  )
}
