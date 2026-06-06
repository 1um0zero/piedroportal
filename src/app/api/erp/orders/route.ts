import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isErpAuthorized } from '@/lib/erp/auth'
import { toErpOrder, ERP_CONTRACT_VERSION } from '@/lib/erp/order-contract'

export const dynamic = 'force-dynamic'

/**
 * GET /api/erp/orders — the a-shell ERP pulls orders to import.
 *
 * Auth: Authorization: Bearer <ERP_API_TOKEN>
 *
 * Query params:
 *   pending=1 (default)  only orders not yet exported (erp_exported_at IS NULL)
 *   all=1                include already-exported orders (overrides pending)
 *   status=submitted     CSV of statuses to include (default: submitted,approved)
 *   since=<ISO>          only orders updated at/after this timestamp
 *   limit=<n>            max rows (default 200, max 1000)
 *
 * Returns { contract_version, count, orders[] }. The ERP should POST the
 * returned order_ids to /api/erp/orders/ack AFTER a successful import so they
 * are not returned again (prevents duplicate imports — a known flaw to kill).
 */
export async function GET(req: Request) {
  if (!isErpAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const all = url.searchParams.get('all') === '1'
  const pending = !all && url.searchParams.get('pending') !== '0'
  const since = url.searchParams.get('since')
  const statusCsv = url.searchParams.get('status') ?? 'submitted,approved'
  const statuses = statusCsv.split(',').map(s => s.trim()).filter(Boolean)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10) || 200, 1000)

  const service = createServiceClient()

  let query = service
    .from('orders')
    .select('*, products(style_name, colour_id)')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (statuses.length) query = query.in('status', statuses)
  if (pending) query = query.is('erp_exported_at', null)
  if (since) query = query.gte('updated_at', since)

  const { data: orders, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve company erp_code in one extra query (no reliance on a companies FK embed).
  const companyIds = [...new Set((orders ?? []).map(o => o.company_id).filter(Boolean))]
  const companyById = new Map<string, { erp_code: string | null; name: string | null }>()
  if (companyIds.length) {
    const { data: companies } = await service
      .from('companies').select('id, erp_code, name').in('id', companyIds)
    for (const c of companies ?? []) companyById.set(c.id, { erp_code: c.erp_code, name: c.name })
  }

  const payload = (orders ?? []).map(o => toErpOrder(o, companyById.get(o.company_id)))
  return NextResponse.json({
    contract_version: ERP_CONTRACT_VERSION,
    count: payload.length,
    orders: payload,
  })
}
