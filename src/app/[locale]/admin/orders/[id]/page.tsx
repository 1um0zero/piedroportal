import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireOrdersViewPage } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
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
const SELECT_FULL = `${SELECT_BASE}, piedro_order_id, piedro_notes, approval_state, production_state, tracking_code, tracking_link, expected_dispatch_date`

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const service = createServiceClient()

  // Auth/scope and the order itself are independent — fetch them together.
  const [{ scope, canWrite }, { data: full, error: fullErr }] = await Promise.all([
    requireOrdersViewPage(),
    service.from('orders').select(SELECT_FULL).eq('id', id).single(),
  ])

  // Fall back to base select only if the full one fails (missing columns).
  let order = null
  if (fullErr) {
    const { data: base } = await service
      .from('orders').select(SELECT_BASE).eq('id', id).single()
    order = base
  } else {
    order = full
  }

  if (!order) notFound()

  // Branch staff cannot open an order whose model or company is outside their scope.
  const orderStyle = (order as { products?: { style_name?: string } }).products?.style_name
  const orderCompanyId = (order as { companies?: { id?: string } }).companies?.id
  if (!scope.allModels && (!scope.canModel(orderStyle) || !scope.canCompany(orderCompanyId))) redirect('/admin/orders')

  // Everything below is independent of the order row → run it all in parallel
  // instead of five sequential round-trips.
  const [signedPdf, neighbors, ordererRes, settings, navT] = await Promise.all([
    order.pdf_url ? signOrderPdf(id) : Promise.resolve(null),
    // Prev/next navigator — only for full-catalogue admins (branch scope is by
    // model, which can't be expressed in a simple neighbour query).
    scope.allModels && order.created_at
      ? getOrderNeighbors(service, { id: order.id, created_at: order.created_at })
      : Promise.resolve({ prevId: null, nextId: null }),
    // Client contact, for the "email client" shortcut.
    order.user_id
      ? service.from('profiles').select('email').eq('id', order.user_id).single()
      : Promise.resolve({ data: null }),
    getSettings(['order_notify_email']),
    getTranslations('nav'),
  ])

  if (signedPdf) order.pdf_url = signedPdf
  const { prevId, nextId } = neighbors
  const deskEmail = settings.order_notify_email ?? ''
  const clientCc = (order as { companies?: { notify_cc?: string } }).companies?.notify_cc ?? ''

  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          ← {navT('orders')}
        </Link>
      </div>
      <OrderDetailView order={order} isAdmin={true} readOnly={!canWrite} isFullAdmin={isPiedroAdmin(scope.role)} prevId={prevId} nextId={nextId}
        clientEmail={ordererRes.data?.email ?? ''} clientCc={clientCc} deskEmail={deskEmail} />
    </div>
  )
}
