import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireBackofficePage } from '@/lib/admin/scope'
import { signOrderPdf } from '@/lib/order-pdf'
import { getOrderNeighbors } from '@/lib/order-neighbors'
import { getSettings } from '@/lib/settings'
import OrderDetailView from '@/components/order/OrderDetailView'
import { Link } from '@/i18n/navigation'

// Base select — always works
const SELECT_BASE = `id, user_id, order_seq, status, unit, quantity, reference_customer, patient_name, clinician,
  construction_left, construction_right, width_left, width_right, size_left, size_right,
  diff_sizes_pairs, additions, comments, created_at, pdf_url,
  products(id, colour_id, color_name, closure, picture_name, style_name),
  companies(id, name, notify_cc)`

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

  // Client contact + order desk address, for the "email client" shortcut. Cc the
  // desk so the thread stays with Piedro; To the ordering user (+ company Cc).
  const { data: orderer } = order.user_id
    ? await service.from('profiles').select('email').eq('id', order.user_id).single()
    : { data: null }
  const deskEmail = (await getSettings(['order_notify_email'])).order_notify_email ?? ''
  const clientCc = (order as { companies?: { notify_cc?: string } }).companies?.notify_cc ?? ''

  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          ← {(await getTranslations('nav'))('orders')}
        </Link>
      </div>
      <OrderDetailView order={order} isAdmin={true} prevId={prevId} nextId={nextId}
        clientEmail={orderer?.email ?? ''} clientCc={clientCc} deskEmail={deskEmail} />
    </div>
  )
}
