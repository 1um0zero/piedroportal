'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { toIlikePattern } from '@/lib/search'

export type StockAdminRow = {
  id: string
  style_name: string
  colour_id: string
  color_name: string
  picture_name: string
  size_first: number
  size_last: number
  size_unit: 'EU' | 'UK' | null
  stock: Record<number, number>  // size → qty_on_hand
}

/** All STOCK-flagged products with their per-size on-hand quantities. */
export async function getStockAdminRows(): Promise<StockAdminRow[]> {
  await requirePiedroAdminPage()
  const service = createServiceClient()

  const { data: products } = await service
    .from('products')
    .select('id, style_name, colour_id, color_name, picture_name, size_first, size_last, size_unit')
    .eq('is_stock', true)
    .order('style_name')
    .order('colour_id')

  const rows = (products ?? []) as Omit<StockAdminRow, 'stock'>[]
  if (rows.length === 0) return []

  const { data: stock } = await service
    .from('product_stock')
    .select('product_id, size, qty_on_hand')
    .in('product_id', rows.map((r) => r.id))

  const byProduct = new Map<string, Record<number, number>>()
  for (const s of (stock ?? []) as Array<{ product_id: string; size: number; qty_on_hand: number }>) {
    const m = byProduct.get(s.product_id) ?? {}
    m[Number(s.size)] = s.qty_on_hand
    byProduct.set(s.product_id, m)
  }

  return rows.map((r) => ({ ...r, stock: byProduct.get(r.id) ?? {} }))
}

/** Search active products by colour_id / style to add to the STOCK area. */
export async function searchProductsForStock(query: string): Promise<
  Array<{ id: string; style_name: string; colour_id: string; color_name: string }>
> {
  await requirePiedroAdminPage()
  const q = query.trim()
  if (q.length < 2) return []
  const pattern = toIlikePattern(q)
  const service = createServiceClient()
  const { data } = await service
    .from('products')
    .select('id, style_name, colour_id, color_name')
    .eq('active', true)
    .eq('is_stock', false)
    .or(`colour_id.ilike.${pattern},style_name.ilike.${pattern}`)
    .order('colour_id')
    .limit(100)
  return (data ?? []) as Array<{ id: string; style_name: string; colour_id: string; color_name: string }>
}

/** Bulk-flag a selection of products as STOCK and return the refreshed admin rows. */
export async function addProductsToStockAction(productIds: string[]): Promise<{ rows?: StockAdminRow[]; error?: string }> {
  await requirePiedroAdminPage()
  if (productIds.length === 0) return { rows: await getStockAdminRows() }
  const service = createServiceClient()
  const { error } = await service.from('products').update({ is_stock: true }).in('id', productIds)
  if (error) return { error: error.message }
  revalidatePath('/admin/stock')
  return { rows: await getStockAdminRows() }
}

export async function setStockFlagAction(productId: string, isStock: boolean): Promise<{ error?: string }> {
  await requirePiedroAdminPage()
  const service = createServiceClient()
  const { error } = await service.from('products').update({ is_stock: isStock }).eq('id', productId)
  if (error) return { error: error.message }
  // Removing the flag drops its stock rows so it can't linger as reservable.
  if (!isStock) await service.from('product_stock').delete().eq('product_id', productId)
  revalidatePath('/admin/stock')
  return {}
}

/**
 * Replace the on-hand quantities for one product. Rows with qty 0 are deleted so
 * the size disappears from the grid (available ≤ 0 is hidden anyway, but this
 * keeps the table clean).
 */
export async function saveProductStockAction(
  productId: string,
  quantities: Array<{ size: number; qty: number }>,
): Promise<{ error?: string }> {
  await requirePiedroAdminPage()
  const service = createServiceClient()

  const upserts = quantities
    .filter((q) => q.qty > 0)
    .map((q) => ({ product_id: productId, size: q.size, qty_on_hand: q.qty, updated_at: new Date().toISOString() }))
  const zeros = quantities.filter((q) => q.qty <= 0).map((q) => q.size)

  if (upserts.length > 0) {
    const { error } = await service.from('product_stock').upsert(upserts, { onConflict: 'product_id,size' })
    if (error) return { error: error.message }
  }
  if (zeros.length > 0) {
    await service.from('product_stock').delete().eq('product_id', productId).in('size', zeros)
  }
  revalidatePath('/admin/stock')
  return {}
}

/** Save the whole grid in one go — only the dirty rows are sent. */
export async function saveStockGridAction(
  entries: Array<{ productId: string; quantities: Array<{ size: number; qty: number }> }>,
): Promise<{ error?: string }> {
  await requirePiedroAdminPage()
  const service = createServiceClient()
  const now = new Date().toISOString()

  const upserts = entries.flatMap((e) =>
    e.quantities
      .filter((q) => q.qty > 0)
      .map((q) => ({ product_id: e.productId, size: q.size, qty_on_hand: q.qty, updated_at: now })),
  )
  if (upserts.length > 0) {
    const { error } = await service.from('product_stock').upsert(upserts, { onConflict: 'product_id,size' })
    if (error) return { error: error.message }
  }
  for (const e of entries) {
    const zeros = e.quantities.filter((q) => q.qty <= 0).map((q) => q.size)
    if (zeros.length > 0) {
      await service.from('product_stock').delete().eq('product_id', e.productId).in('size', zeros)
    }
  }
  revalidatePath('/admin/stock')
  return {}
}
