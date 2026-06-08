import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasAnyCompany, getAdminCompanyIds } from '@/lib/user-companies'
import { signOrderPdf } from '@/lib/order-pdf'
import { getOrderNeighbors } from '@/lib/order-neighbors'
import OrderDetailView from '@/components/order/OrderDetailView'
import { Link } from '@/i18n/navigation'

const SELECT_BASE = `id, status, unit, quantity, reference_customer, patient_name, clinician,
  construction_left, construction_right, width_left, width_right, size_left, size_right,
  diff_sizes_pairs, additions, comments, created_at, pdf_url,
  products(id, colour_id, color_name, closure, picture_name, style_name),
  companies(id, name)`

const SELECT_FULL = `${SELECT_BASE}, piedro_order_id, piedro_notes, approval_state, production_state`

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await sb
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role === 'piedro_admin') redirect(`/admin/orders/${id}`)

  // Check if user has any company
  const userHasCompany = await hasAnyCompany(user.id)
  if (!userHasCompany) redirect('/orders')

  // Get companies where user is admin
  const adminCompanyIds = await getAdminCompanyIds(user.id)
  const isCompanyAdmin = adminCompanyIds.length > 0

  const service = createServiceClient()

  // Build query with security filters
  let order = null
  let query = service.from('orders').select(SELECT_FULL).eq('id', id)

  // Company admins can view orders from companies they admin
  if (isCompanyAdmin) {
    query = query.in('company_id', adminCompanyIds)
  } else {
    // Regular users can only view their own orders
    query = query.eq('user_id', user.id)
  }

  const { data: full, error: fullErr } = await query.single()

  if (fullErr) {
    // Fallback to base fields (no admin fields)
    let baseQuery = service.from('orders').select(SELECT_BASE).eq('id', id)
    if (isCompanyAdmin) {
      baseQuery = baseQuery.in('company_id', adminCompanyIds)
    } else {
      baseQuery = baseQuery.eq('user_id', user.id)
    }
    const { data: base } = await baseQuery.single()
    order = base
  } else {
    order = full
  }

  if (!order) notFound()

  // Replace the stored path with a short-lived signed URL (private bucket).
  if (order.pdf_url) order.pdf_url = await signOrderPdf(id)

  // Prev/next navigator — within the same visibility scope as the list.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyScope = (q: any) => isCompanyAdmin ? q.in('company_id', adminCompanyIds) : q.eq('user_id', user.id)
  const { prevId, nextId } = order.created_at
    ? await getOrderNeighbors(service, { id: order.id, created_at: order.created_at }, applyScope)
    : { prevId: null, nextId: null }

  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          ← My Orders
        </Link>
      </div>
      <OrderDetailView order={order} isAdmin={false} prevId={prevId} nextId={nextId} />
    </div>
  )
}
