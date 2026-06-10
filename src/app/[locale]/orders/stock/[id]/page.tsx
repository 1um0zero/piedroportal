import { notFound } from 'next/navigation'
import { getStockOrderDetail } from '@/app/actions/stock'
import StockOrderDetailView from '@/components/stock/StockOrderDetailView'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function StockOrderPage({ params }: Props) {
  const { id } = await params
  const order = await getStockOrderDetail(id)
  if (!order) notFound()
  return <StockOrderDetailView order={order} isAdmin={false} />
}
