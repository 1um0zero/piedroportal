import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isErpAuthorized } from '@/lib/erp/auth'
import { signOrderPdfs } from '@/lib/order-pdf'

export const dynamic = 'force-dynamic'

/**
 * GET /api/erp/orders/[id]/pdf — fresh signed URL to an order's Portal PDF.
 *
 * Auth: Authorization: Bearer <ERP_API_TOKEN>
 *
 * The a-shell "Consola de encomendas" calls this (by the portal order UUID it
 * stored at import time, enccli online'id$) to get a still-valid link to the
 * online order's PDF, then opens it with `xcall miamex, 96`. A dedicated endpoint
 * is needed because the pdf_url handed out by GET /api/erp/orders is short-lived
 * (8h) — the console may open an order days later, long after that link expired.
 *
 * `id` is the portal order UUID. Returns { pdf_url } (signed, 8h) or 404 when the
 * order has no stored PDF (e.g. a migrated order that never went through submit).
 */
type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  if (!isErpAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const service = createServiceClient()
  const { data: order, error } = await service
    .from('orders').select('id, pdf_url').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Only online orders carry a stored PDF; migrated orders never went through submit.
  if (!order.pdf_url) return NextResponse.json({ error: 'No PDF for this order' }, { status: 404 })

  // Fresh 8h signed URL (a working day), same window as the pull endpoint.
  const signed = (await signOrderPdfs([order.id], 8 * 60 * 60))[order.id]
  if (!signed) return NextResponse.json({ error: 'PDF unavailable' }, { status: 404 })

  return NextResponse.json({ pdf_url: signed })
}
