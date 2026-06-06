import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isErpAuthorized } from '@/lib/erp/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/erp/orders/ack — the ERP confirms it imported the given orders.
 * Sets erp_exported_at = now() so they are not returned by GET /api/erp/orders
 * again. Explicit ack (instead of auto-marking on read) means an ERP crash
 * mid-import never loses orders.
 *
 * Auth: Authorization: Bearer <ERP_API_TOKEN>
 * Body: { "order_ids": ["uuid", ...] }
 */
export async function POST(req: Request) {
  if (!isErpAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { order_ids?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const ids = Array.isArray(body.order_ids)
    ? body.order_ids.filter((x): x is string => typeof x === 'string')
    : []
  if (!ids.length) return NextResponse.json({ error: 'order_ids[] required' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('orders')
    .update({ erp_exported_at: new Date().toISOString() })
    .in('id', ids)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ acknowledged: data?.length ?? 0 })
}
