import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import OrderDetailView from '@/components/order/OrderDetailView'
import { Link } from '@/i18n/navigation'

const SELECT_BASE = `id, status, unit, quantity, reference_customer, patient_name, clinician,
  construction_left, construction_right, width_left, width_right, size_left, size_right,
  additions, comments, created_at, pdf_url,
  products(id, colour_id, color_name, closure, picture_name),
  companies(id, name)`

const SELECT_FULL = `${SELECT_BASE}, piedro_order_id, piedro_notes, approval_state, production_state`

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await sb
    .from('profiles').select('company_id, role').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/orders')
  if (profile.role === 'piedro_admin') redirect(`/admin/orders/${id}`)

  const service = createServiceClient()
  const isCompanyAdmin = profile.role === 'company_admin'

  // Build query with security filters
  let order = null
  let query = service.from('orders').select(SELECT_FULL).eq('id', id).eq('company_id', profile.company_id)

  // Regular users can only view their own orders
  if (!isCompanyAdmin) {
    query = query.eq('user_id', user.id)
  }

  const { data: full, error: fullErr } = await query.single()

  if (fullErr) {
    // Fallback to base fields (no admin fields)
    let baseQuery = service.from('orders').select(SELECT_BASE).eq('id', id).eq('company_id', profile.company_id)
    if (!isCompanyAdmin) {
      baseQuery = baseQuery.eq('user_id', user.id)
    }
    const { data: base } = await baseQuery.single()
    order = base
  } else {
    order = full
  }

  if (!order) notFound()

  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          ← My Orders
        </Link>
      </div>
      <OrderDetailView order={order} isAdmin={false} />
    </div>
  )
}
