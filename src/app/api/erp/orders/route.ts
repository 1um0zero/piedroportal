import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isErpAuthorized } from '@/lib/erp/auth'
import { toErpOrder, ERP_CONTRACT_VERSION } from '@/lib/erp/order-contract'
import { ensureCommentsPt } from '@/lib/erp/translate-comments'
import { signOrderPdfs } from '@/lib/order-pdf'

export const dynamic = 'force-dynamic'

/**
 * GET /api/erp/orders — the a-shell ERP pulls orders to import.
 *
 * Auth: Authorization: Bearer <ERP_API_TOKEN>
 *
 * Query params:
 *   pending=1 (default)  only orders not yet exported (erp_exported_at IS NULL)
 *   all=1                include already-exported orders (overrides pending)
 *   exported=1           only orders already imported by the console
 *                        (erp_exported_at IS NOT NULL), regardless of status —
 *                        a freshly-imported order is still `approved` (its
 *                        production_state is just "order_received"), so a
 *                        status-based filter would miss it. Drops the default
 *                        status filter and implies all=1.
 *   status=submitted     CSV of statuses to include (default: submitted,approved)
 *   include_vsi_direct=1 also pull VSI-direct orders: accounts whose erp_code
 *                        starts with "08" (Voetmax/ZSM/Tallermade…) are billed
 *                        by VSI, never approved at Piedro and never get a Piedro
 *                        Order — so they must surface as soon as `submitted`.
 *                        When set, the status filter becomes:
 *                        approved (any account) OR submitted (08-account).
 *   submitted_exclude_account=<csv>  CSV of erp_codes (e.g. 000145,000154).
 *                        Status filter becomes: approved (any account) OR
 *                        submitted (any account EXCEPT the listed ones). Stopgap
 *                        for VSI-direct visibility until a companies.vsi_direct
 *                        flag exists.
 *   since=<ISO>          only orders updated at/after this timestamp
 *   piedro_order=<csv>   CSV of Piedro Order numbers; * = wildcard (e.g. 65*).
 *                        Mirrors the a-shell console filter: when present, the
 *                        pending/status defaults are dropped (search everything).
 *   created_from=<date>  only orders created at/after this date (YYYY-MM-DD or ISO)
 *   created_to=<date>    only orders created at/before this date (inclusive)
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
  // An explicit piedro_order search behaves like the old Dataverse console filter:
  // it looks across ALL orders unless pending/status are explicitly given too.
  const piedroTerms = (url.searchParams.get('piedro_order') ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)
  const hasOrderFilter = piedroTerms.length > 0
  const all = url.searchParams.get('all') === '1'
  const exported = url.searchParams.get('exported') === '1'
  const includeVsiDirect = url.searchParams.get('include_vsi_direct') === '1'
  const pendingParam = url.searchParams.get('pending')
  const pending = !all && !exported && (hasOrderFilter ? pendingParam === '1' : pendingParam !== '0')
  const since = url.searchParams.get('since')
  const statusCsv = url.searchParams.get('status') ?? ((hasOrderFilter || exported) ? '' : 'submitted,approved')
  const statuses = statusCsv.split(',').map(s => s.trim()).filter(Boolean)
  const createdFrom = url.searchParams.get('created_from')
  const createdTo = url.searchParams.get('created_to')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10) || 200, 1000)

  const service = createServiceClient()

  let query = service
    .from('orders')
    .select('*, products(style_name, colour_id, closure, section)')
    .order('created_at', { ascending: true })
    .limit(limit)

  // Stopgap until a real companies.vsi_direct flag exists: pull approved orders
  // (any account) plus submitted orders from every account EXCEPT the listed
  // Piedro accounts (e.g. 000145, 000154) — so VSI-direct clients' unapproved
  // orders surface without dragging in Piedro's own not-yet-approved orders.
  const submittedExclude = (url.searchParams.get('submitted_exclude_account') ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)

  if (includeVsiDirect) {
    // VSI-direct accounts (erp_code "08…") are never approved at Piedro: bring
    // them in as soon as `submitted`, alongside the normal approved orders.
    const { data: vsiCompanies } = await service
      .from('companies').select('id').ilike('erp_code', '08%')
    const vsiIds = (vsiCompanies ?? []).map(c => c.id)
    query = query.or(
      vsiIds.length
        ? `status.eq.approved,and(status.eq.submitted,company_id.in.(${vsiIds.join(',')}))`
        : 'status.eq.approved'
    )
  } else if (submittedExclude.length) {
    const { data: exCompanies } = await service
      .from('companies').select('id').in('erp_code', submittedExclude)
    const exIds = (exCompanies ?? []).map(c => c.id)
    query = query.or(
      exIds.length
        ? `status.eq.approved,and(status.eq.submitted,company_id.not.in.(${exIds.join(',')}))`
        : 'status.eq.approved,status.eq.submitted'
    )
  } else if (statuses.length) {
    query = query.in('status', statuses)
  }
  if (pending) query = query.is('erp_exported_at', null)
  if (exported) query = query.not('erp_exported_at', 'is', null)
  if (since) query = query.gte('updated_at', since)
  if (hasOrderFilter) {
    query = query.or(piedroTerms.map(t =>
      t.includes('*')
        ? `piedro_order_id.ilike.${t.replace(/\*/g, '%')}`
        : `piedro_order_id.eq.${t}`
    ).join(','))
  }
  if (createdFrom) query = query.gte('created_at', createdFrom)
  if (createdTo) query = query.lte('created_at', createdTo.length === 10 ? `${createdTo}T23:59:59.999Z` : createdTo)

  const { data: orders, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fill/refresh the PT translation cache for any comments that need it (the
  // grid reads comments_pt). Best-effort; mutates rows in place.
  await ensureCommentsPt(orders ?? [], service)

  // Direct, read-only signed URLs to each order's PDF (8h — a working day), so
  // the grid link opens just the PDF (no editable portal page). Mutates rows.
  const pdfMap = await signOrderPdfs((orders ?? []).filter(o => o.pdf_url).map(o => o.id), 8 * 60 * 60)
  for (const o of orders ?? []) (o as Record<string, unknown>).pdf_signed = pdfMap[o.id] ?? null

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
