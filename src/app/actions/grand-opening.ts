'use server'

import { getAdminScope } from '@/lib/admin/scope'
import { isSuperAdmin } from '@/lib/roles'
import { createServiceClient } from '@/lib/supabase/service'
import { fetchAll } from '@/lib/fetch-all'

/**
 * Grand Opening — the one-time cut-over from the test phase to production.
 * Deletes every order CREATED IN THE PORTAL (all of them were tests):
 *   - configured orders where dataverse_id IS NULL (migrated orders are kept)
 *   - all stock orders (stock ordering only exists in the portal)
 *   - their PDFs in the private `order-pdfs` bucket
 * Super-admin only; the caller must type the confirmation word in the UI.
 */
export async function deletePortalTestOrdersAction(): Promise<{
  ok?: boolean
  error?: string
  deletedOrders?: number
  deletedStockOrders?: number
  deletedPdfs?: number
}> {
  const scope = await getAdminScope()
  if (!scope || !isSuperAdmin(scope.role)) return { error: 'Not authorized' }

  const service = createServiceClient()

  // Collect ids first (also the PDF paths — both kinds store `${id}.pdf`).
  // Paginated: an unbounded select caps at 1000 rows → silently partial purge.
  const portalOrders = await fetchAll<{ id: string }>(page => service
    .from('orders').select('id').is('dataverse_id', null).range(page.from, page.to))
  const stockOrders = await fetchAll<{ id: string }>(page => service
    .from('stock_orders').select('id').range(page.from, page.to))

  const orderIds = portalOrders.map(o => o.id)
  const stockIds = stockOrders.map(o => o.id)

  // PDFs — remove in chunks; missing files are not an error.
  const pdfPaths = [...orderIds, ...stockIds].map(id => `${id}.pdf`)
  let deletedPdfs = 0
  for (let i = 0; i < pdfPaths.length; i += 100) {
    const { data } = await service.storage.from('order-pdfs').remove(pdfPaths.slice(i, i + 100))
    deletedPdfs += data?.length ?? 0
  }

  // Stock orders: items first (releases computed stock reservations), then heads.
  if (stockIds.length) {
    const { error } = await service.from('stock_order_items').delete().in('stock_order_id', stockIds)
    if (error) return { error: `stock_order_items: ${error.message}` }
    const { error: e } = await service.from('stock_orders').delete().in('id', stockIds)
    if (e) return { error: `stock_orders: ${e.message}` }
  }

  // Portal-created configured orders (chunked: .in() has URL-length limits).
  for (let i = 0; i < orderIds.length; i += 200) {
    const { error } = await service.from('orders').delete().in('id', orderIds.slice(i, i + 200))
    if (error) return { error: `orders: ${error.message}` }
  }

  return { ok: true, deletedOrders: orderIds.length, deletedStockOrders: stockIds.length, deletedPdfs }
}
