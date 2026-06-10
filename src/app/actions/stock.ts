'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin as isPiedroAdminRole } from '@/lib/roles'
import { getUserCompanyIds, getUserExclusiveLabels } from '@/lib/user-companies'
import { isExclusiveVisible } from '@/lib/exclusive'
import { getSettings } from '@/lib/settings'
import { addWorkingDays } from '@/lib/dispatch'
import type { Product, StockProduct, StockSize } from '@/types'

// Same product fields the gallery/catalogue use, + exclusive for visibility.
const FIELDS = [
  'id', 'style_name', 'colour_id', 'picture_name', 'section',
  'closure', 'type', 'color_basic', 'color_name', 'color_name_i18n',
  'size_first', 'size_last', 'size_unit', 'diabetics', 'new_until', 'constructions',
  'exclusive', 'is_stock',
].join(',')

// A stock_order_items row stops reserving once its order reaches a terminal
// state. At that point the physical qty_on_hand has been (or is being)
// decremented externally (manual/XLS/ERP), so counting it again would
// double-subtract. Everything else (submitted/approved/in_production) reserves.
const TERMINAL_STATUSES = ['shipped', 'delivered', 'cancelled']

/**
 * STOCK products visible to the signed-in user, each with per-size availability.
 *
 *   available = product_stock.qty_on_hand − reserved
 *   reserved  = Σ stock_order_items.qty of NON-TERMINAL stock_orders
 *
 * Only sizes with available > 0 are returned, and only products that still have
 * at least one available size. Anonymous users get [] (the grid is gated).
 */
export async function getStockProducts(): Promise<StockProduct[]> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = isPiedroAdminRole(profile?.role)
  const labels = await getUserExclusiveLabels(user.id)
  const labelSet = new Set(labels)

  const service = createServiceClient()

  // 1. Active STOCK products, filtered by exclusivity visibility.
  const { data: prodRows } = await service
    .from('products')
    .select(FIELDS)
    .eq('active', true)
    .eq('is_stock', true)
    .order('style_name')

  const products = ((prodRows ?? []) as unknown as (Product & { exclusive: string | null })[])
    .filter((p) => isExclusiveVisible(p.exclusive, labelSet, isAdmin))
  if (products.length === 0) return []

  const ids = products.map((p) => p.id)

  // 2. Physical stock per (product, size).
  const { data: stockRows } = await service
    .from('product_stock')
    .select('product_id, size, qty_on_hand')
    .in('product_id', ids)

  // 3. Reserved per (product, size): Σ qty of items in non-terminal orders.
  const { data: itemRows } = await service
    .from('stock_order_items')
    .select('product_id, size, qty, stock_orders!inner(status)')
    .in('product_id', ids)

  const reserved = new Map<string, number>()
  for (const r of (itemRows ?? []) as Array<{ product_id: string; size: number; qty: number; stock_orders: { status: string } | { status: string }[] }>) {
    const so = Array.isArray(r.stock_orders) ? r.stock_orders[0] : r.stock_orders
    if (!so || TERMINAL_STATUSES.includes(so.status)) continue
    const key = `${r.product_id}:${r.size}`
    reserved.set(key, (reserved.get(key) ?? 0) + r.qty)
  }

  // 4. Build available size lists; drop empty sizes and empty products.
  const sizesByProduct = new Map<string, StockSize[]>()
  for (const s of (stockRows ?? []) as Array<{ product_id: string; size: number; qty_on_hand: number }>) {
    const available = s.qty_on_hand - (reserved.get(`${s.product_id}:${s.size}`) ?? 0)
    if (available <= 0) continue
    const arr = sizesByProduct.get(s.product_id) ?? []
    arr.push({ size: Number(s.size), available })
    sizesByProduct.set(s.product_id, arr)
  }

  return products
    .map((p) => {
      const sizes = (sizesByProduct.get(p.id) ?? []).sort((a, b) => a.size - b.size)
      return { ...p, sizes } as StockProduct
    })
    .filter((p) => p.sizes.length > 0)
}

// ── Submit ──────────────────────────────────────────────────────────────────

export type StockOrderInput = {
  company_id: string | null
  locale: string
  comments: string | null
  items: Array<{ product_id: string; size: number; qty: number }>
}

async function computeStockDispatchDate(
  service: ReturnType<typeof createServiceClient>,
): Promise<string | null> {
  const s = await getSettings(['dispatch_days_normal'])
  const days = parseInt(s.dispatch_days_normal || '0', 10) || 0
  if (!days) return null
  const { data: cl } = await service.from('factory_closures').select('date')
  const closures = new Set((cl ?? []).map((r) => (r as { date: string }).date))
  return addWorkingDays(new Date().toISOString(), days, closures)
}

/**
 * Create a STOCK order (header + items). Stock orders have no draft — they
 * reserve on submit. Availability is re-checked server-side against live stock
 * so a stale grid can never oversell.
 */
export async function submitStockOrderAction(
  input: StockOrderInput,
): Promise<{ id?: string; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const items = (input.items ?? []).filter((i) => i.qty > 0)
  if (items.length === 0) return { error: 'Empty order' }

  // Company ownership: non-admins may only order for a company they belong to.
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = isPiedroAdminRole(profile?.role)
  if (!isAdmin) {
    const companyIds = await getUserCompanyIds(user.id)
    if (!input.company_id || !companyIds.includes(input.company_id)) {
      return { error: 'You do not have access to this company' }
    }
  }

  // Re-validate availability against live stock (defends against a stale grid).
  const available = new Map<string, number>()
  for (const p of await getStockProducts()) {
    for (const s of p.sizes) available.set(`${p.id}:${s.size}`, s.available)
  }
  for (const i of items) {
    const cap = available.get(`${i.product_id}:${i.size}`) ?? 0
    if (i.qty > cap) {
      return { error: `Requested quantity exceeds available stock for one of the items.` }
    }
  }

  const service = createServiceClient()
  const expected_dispatch_date = await computeStockDispatchDate(service)
  const { data: order, error } = await service
    .from('stock_orders')
    .insert({
      user_id:    user.id,
      company_id: input.company_id,
      status:     'submitted',
      locale:     input.locale,
      comments:   input.comments,
      expected_dispatch_date,
    })
    .select('id')
    .single()

  if (error || !order?.id) {
    return { error: error ? `${error.message} [${error.code}]` : 'The order could not be saved.' }
  }
  const orderId: string = order.id

  const { error: itemsError } = await service.from('stock_order_items').insert(
    items.map((i) => ({ stock_order_id: orderId, product_id: i.product_id, size: i.size, qty: i.qty })),
  )
  if (itemsError) {
    // Roll back the header so we never leave an order with no lines.
    await service.from('stock_orders').delete().eq('id', orderId)
    return { error: `${itemsError.message} [${itemsError.code}]` }
  }

  return { id: orderId }
}
