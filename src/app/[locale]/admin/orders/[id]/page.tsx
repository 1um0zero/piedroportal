import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import OrderDetailView from '@/components/order/OrderDetailView'
import { Link } from '@/i18n/navigation'

const SELECT = `id, status, unit, quantity, reference_customer, patient_name, clinician,
  construction_left, construction_right, width_left, width_right, size_left, size_right,
  additions, comments, created_at, pdf_url, piedro_order_id, piedro_notes,
  approval_state, production_state,
  products(id, colour_id, color_name, closure, picture_name),
  companies(id, name)`

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'piedro_admin') redirect('/orders')

  const service = createServiceClient()
  const { data: order } = await service.from('orders').select(SELECT).eq('id', id).single()
  if (!order) notFound()

  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          ← All Orders
        </Link>
      </div>
      <OrderDetailView order={order} isAdmin={true} />
    </div>
  )
}
