import { notFound } from 'next/navigation'
import { requireBackofficePage } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { getStockOrderDetail } from '@/app/actions/stock'
import StockOrderDetailView from '@/components/stock/StockOrderDetailView'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminStockOrderPage({ params }: Props) {
  const { id } = await params
  const scope = await requireBackofficePage()
  const order = await getStockOrderDetail(id)
  if (!order) notFound()
  return <StockOrderDetailView order={order} isAdmin={isPiedroAdmin(scope.role)} />
}
