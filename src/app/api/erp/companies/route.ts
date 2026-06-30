import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isErpAuthorized } from '@/lib/erp/auth'
import { logAdminAction } from '@/lib/admin/audit'
import { ERP_CONTRACT_VERSION } from '@/lib/erp/order-contract'
import { normaliseCountry } from '@/lib/erp/country'

export const dynamic = 'force-dynamic'

/**
 * /api/erp/companies — the a-shell ERP creates/updates portal companies, replacing
 * the Dataverse `accounts` create/patch path that lived in entent.bpi
 * (FN'processa'dataverse'actions). Companies are born ERP-side (VSI) — some are
 * Piedro departments, others VSI-direct billing clients. The portal company id
 * is the durable cross-reference (was the Dataverse accountid, which is in fact
 * the same value: the import seeded companies.id from accountid).
 *
 * Both grid actions map here, differing only in which fields the ERP sources:
 *   - "Cliente"      → the empresa ficha itself (erp_code = company code)
 *   - "Departamento" → a department row (erp_code = the client it belongs to, e.g. 145/154)
 *
 * Auth: Authorization: Bearer <ERP_API_TOKEN>
 *
 * POST  upsert. Body: {
 *   portal_id?: string,        // when present → update THIS company by id (the "exists in portal" case)
 *   erp_code: string,          // required
 *   name?: string,             // required when creating (portal_id empty → always inserts a new company)
 *   address_line1?, city?, country?, country_code?: string,
 *   actor_source?, actor_user?, actor_name?: string,  // audit
 *   automated?: boolean
 * }
 * Returns { ok: true, id, created } — `created` true when a new row was inserted.
 * Only provided fields are written (PATCH semantics).
 *
 * GET   lookup/validate (the "Valida" action). ?erp_code=145 [&name=foo]
 * Returns { contract_version, count, companies: [{ id, erp_code, name, country_code, city, address_line1 }] }
 */

const COMPANY_COLS = 'id, erp_code, name, country_code, country, city, address_line1'

export async function GET(req: Request) {
  if (!isErpAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const erpCode = (url.searchParams.get('erp_code') ?? '').trim()
  const name = (url.searchParams.get('name') ?? '').trim()
  const portalId = (url.searchParams.get('portal_id') ?? '').trim()

  if (!erpCode && !name && !portalId) {
    return NextResponse.json({ error: 'erp_code, name or portal_id required' }, { status: 400 })
  }

  const service = createServiceClient()
  let query = service.from('companies').select(COMPANY_COLS).order('erp_code').limit(50)
  if (portalId) query = query.eq('id', portalId)
  if (erpCode) query = query.eq('erp_code', erpCode)
  if (name) query = query.ilike('name', `%${name}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    contract_version: ERP_CONTRACT_VERSION,
    count: data?.length ?? 0,
    companies: data ?? [],
  })
}

export async function POST(req: Request) {
  if (!isErpAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const portalId = typeof body.portal_id === 'string' ? body.portal_id.trim() : ''
  const erpCode = typeof body.erp_code === 'string' ? body.erp_code.trim() : ''
  if (!portalId && !erpCode) {
    return NextResponse.json({ error: 'erp_code required (or portal_id to update an existing company)' }, { status: 400 })
  }

  // Collect the writable fields the ERP sent (PATCH semantics: only what's present).
  const fields: Record<string, unknown> = {}
  if (erpCode) fields.erp_code = erpCode
  if (typeof body.name === 'string')          fields.name          = body.name.trim()
  if (typeof body.address_line1 === 'string') fields.address_line1 = body.address_line1.trim() || null
  if (typeof body.city === 'string')          fields.city          = body.city.trim() || null
  // Country arrives as messy free text from the ERP (e.g. "PORTUGAL", "HOLANDA").
  // Normalise to a canonical ISO code + English name, keeping the raw for audit
  // — same rules the Dataverse import used (scripts/import-accounts.mjs).
  if (typeof body.country === 'string') {
    const raw = body.country.trim() || null
    const { code, name } = normaliseCountry(raw)
    fields.country_raw  = raw
    fields.country      = name ?? raw
    fields.country_code = code
  }
  if (typeof body.country_code === 'string' && body.country_code.trim()) {
    fields.country_code = body.country_code.trim()  // explicit code wins if provided
  }

  const service = createServiceClient()

  // The portal id is the single source of truth for "which company" (companies
  // are born ERP-side and updated by id). We deliberately do NOT dedup by
  // erp_code: a company and its departments legitimately share the same erp_code
  // (e.g. 145/154), so matching on it would conflate them.
  let id: string
  let created = false

  if (portalId) {
    const { data, error } = await service
      .from('companies').update(fields).eq('id', portalId).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) return NextResponse.json({ error: 'company not found' }, { status: 404 })
    id = data[0].id as string
  } else {
    // Brand-new company (born ERP-side). name is required to create something usable.
    if (!fields.name) {
      return NextResponse.json({ error: 'name required to create a new company' }, { status: 400 })
    }
    const insert = { ...fields, default_locale: 'nl' }  // Piedro default; portal admin can change it
    const { data, error } = await service
      .from('companies').insert(insert).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    id = data![0].id as string
    created = true
  }

  await logAdminAction({
    actorId: null,
    actorRole: 'erp',
    action: 'erp_company_upsert',
    details: {
      company_id: id,
      created,
      erp_code: erpCode || null,
      source: typeof body.actor_source === 'string' ? body.actor_source : 'a-shell',
      ashell_user: typeof body.actor_user === 'string' ? body.actor_user : null,
      ashell_user_name: typeof body.actor_name === 'string' ? body.actor_name : null,
      automated: body.automated === true || body.automated === 'true' || body.automated === '1',
      updated: Object.keys(fields),
    },
  })

  return NextResponse.json({ ok: true, id, created })
}
