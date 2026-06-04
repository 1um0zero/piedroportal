import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { signOrderPdf } from '@/lib/order-pdf'
import OrderDetailView from '@/components/order/OrderDetailView'
import { Link } from '@/i18n/navigation'

// Base select — always works
const SELECT_BASE = `id, status, unit, quantity, reference_customer, patient_name, clinician,
  construction_left, construction_right, width_left, width_right, size_left, size_right,
  additions, comments, created_at, pdf_url,
  products(id, colour_id, color_name, closure, picture_name),
  companies(id, name)`

// Extended select — requires SQL migrations to have been run
const SELECT_FULL = `${SELECT_BASE}, piedro_order_id, piedro_notes, approval_state, production_state`

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'piedro_admin') redirect('/orders')

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

  // Replace the stored path with a short-lived signed URL (private bucket).
  if (order.pdf_url) order.pdf_url = await signOrderPdf(id)

  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          ← All Orders
        </Link>
      </div>
      <OrderDetailView order={order} isAdmin={true} />
    </div>
  )
}
