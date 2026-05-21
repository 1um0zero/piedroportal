import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import OrdersPage from '@/components/orders/OrdersPage'

const SELECT = `
  id, status, approval_state, production_state, unit, patient_name, reference_customer, quantity,
  created_at, updated_at, size_left, size_right, additions, comments, pdf_url,
  products(id, style_name, colour_id, color_name, closure, picture_name, section),
  companies(id, name, erp_code)
`

export default async function AdminOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'piedro_admin') redirect('/orders')

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

  const all = allOrders
  const metrics = {
    total:      all.length,
    draft:      all.filter(o => o.status === 'draft').length,
    submitted:  all.filter(o => o.status === 'submitted').length,
    approved:   all.filter(o => o.status === 'approved').length,
    production: all.filter(o => o.status === 'in_production').length,
    urgent:     all.filter(o => (o.additions as any)?.urgent === true).length,
  }

  return <OrdersPage orders={all} metrics={metrics} isAdmin={true} />
}
