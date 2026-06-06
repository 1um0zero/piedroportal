import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isErpAuthorized } from '@/lib/erp/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/erp/orders/status — the a-shell ERP writes order state back to the portal.
 * Replaces the brittle Dataverse status-update path (Q6.2/Q6.4): a single, idempotent,
 * token-authed call.
 *
 * Auth: Authorization: Bearer <ERP_API_TOKEN>
 * Body: {
 *   order_id: string,            // portal order id (required)
 *   production_state?: string,   // ERP manufacturing stage
 *   approval_state?: string,     // optional
 *   piedro_order_id?: string,    // the ERP's own order number
 *   piedro_notes?: string
 * }
 * Only the provided fields are updated. orders.status is kept in sync.
 */
const APPROVAL_TO_STATUS: Record<string, string> = {
  approved: 'approved',
  refused: 'cancelled',
  under_analysis: 'submitted',
  need_attention: 'submitted',
  awaiting_payment: 'submitted',
}

export async function POST(req: Request) {
  if (!isErpAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const orderId = typeof body.order_id === 'string' ? body.order_id : ''
  if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof body.production_state === 'string') update.production_state = body.production_state
  if (typeof body.approval_state === 'string')   update.approval_state   = body.approval_state
  if (typeof body.piedro_order_id === 'string')  update.piedro_order_id  = body.piedro_order_id
  if (typeof body.piedro_notes === 'string')     update.piedro_notes     = body.piedro_notes
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no updatable fields provided' }, { status: 400 })
  }

  // Keep the simple orders.status in sync (same rules as the back-office action).
  if (typeof body.approval_state === 'string' && APPROVAL_TO_STATUS[body.approval_state]) {
    update.status = APPROVAL_TO_STATUS[body.approval_state]
  }
  if (typeof body.production_state === 'string' && body.production_state) {
    update.status = 'in_production'
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('orders').update(update).eq('id', orderId).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'order not found' }, { status: 404 })

  return NextResponse.json({ ok: true, id: orderId })
}
