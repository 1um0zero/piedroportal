import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isErpAuthorized } from '@/lib/erp/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/erp/orders/events — the a-shell records production-stage events.
 *
 * Unlike /status (which overwrites the CURRENT state), this appends an immutable
 * event per movement, stamped with the REAL A-Shell timestamp. Two callers:
 *   1. Live updates — one event per state change.
 *   2. Historical sweep — many events with their true occurred_at (idempotent:
 *      the unique key (order_id, seccao, posto, occurred_at, es) dedupes, so the
 *      sweep can run repeatedly).
 *
 * After inserting, orders.production_state (and the simple status) is resynced
 * to the LATEST event per affected order, so the existing grid stays correct.
 *
 * Auth: Authorization: Bearer <ERP_API_TOKEN>
 * Body: { events: Event[] }  where Event = {
 *   order_id?: string,        // portal order id (preferred)
 *   order_ref?: string,       // fallback: A-Shell enc$ matched against erp_order_ref
 *   stage: string,            // canonical stage (FN'portal'production$)
 *   seccao?, posto?, es?: string,
 *   qty?: number,
 *   occurred_at: string,      // ISO 8601 — the real stage timestamp
 *   source?, actor_user?, actor_name?: string
 * }
 */
type IncomingEvent = {
  order_id?: string
  order_ref?: string
  stage?: string
  seccao?: string
  posto?: string
  es?: string
  qty?: number
  occurred_at?: string
  source?: string
  actor_user?: string
  actor_name?: string
}

/** production_state -> simple orders.status (mirrors /status route rules). */
function statusFromStage(stage: string): string | null {
  const ps = stage.toLowerCase().replace(/\s+/g, '_')
  if (/deliver/.test(ps)) return 'delivered'
  // received-by-factory and shipping don't move the order out of "approved"/
  // "in_production"; only the production_state records the finer stage.
  if (ps === 'order_received' || ps === 'received' || ps === 'registered') return null
  if (ps === 'dispatched') return null
  return 'in_production'
}

export async function POST(req: Request) {
  if (!isErpAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { events?: IncomingEvent[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const events = Array.isArray(body.events) ? body.events : []
  if (events.length === 0) return NextResponse.json({ error: 'events[] required' }, { status: 400 })

  const service = createServiceClient()

  // Resolve order_ref (A-Shell enc$) -> order_id via erp_order_ref. erp_order_ref
  // may hold two feet joined by "/", e.g. "47503/47504", so index every token.
  const refs = [...new Set(
    events.filter(e => !e.order_id && e.order_ref).map(e => String(e.order_ref).trim()),
  )]
  const refToId = new Map<string, string>()
  if (refs.length) {
    const { data: orders, error } = await service
      .from('orders').select('id, erp_order_ref').not('erp_order_ref', 'is', null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const o of orders ?? []) {
      const raw = String((o as { erp_order_ref: string }).erp_order_ref ?? '')
      for (const tok of raw.split('/')) {
        const t = tok.trim()
        if (t && !refToId.has(t)) refToId.set(t, (o as { id: string }).id)
      }
    }
  }

  // Build the rows, resolving order ids and validating required fields.
  const rows: Record<string, unknown>[] = []
  const affected = new Set<string>()
  const unresolved: string[] = []
  for (const e of events) {
    const orderId = e.order_id
      || (e.order_ref ? refToId.get(String(e.order_ref).trim()) : undefined)
    if (!orderId) { if (e.order_ref) unresolved.push(String(e.order_ref)); continue }
    if (!e.stage || !e.occurred_at) continue
    const occ = new Date(e.occurred_at)
    if (isNaN(occ.getTime())) continue
    rows.push({
      order_id: orderId,
      stage: e.stage,
      seccao: e.seccao ?? '',
      posto: e.posto ?? '',
      es: e.es ?? '',
      qty: typeof e.qty === 'number' ? e.qty : null,
      occurred_at: occ.toISOString(),
      source: e.source ?? 'a-shell',
      actor_user: e.actor_user ?? null,
      actor_name: e.actor_name ?? null,
    })
    affected.add(orderId)
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, affected: 0, unresolved }, { status: 200 })
  }

  // Idempotent insert: ignore rows that already exist (same physical movement).
  const { error: insErr } = await service
    .from('order_production_events')
    .upsert(rows, { onConflict: 'order_id,seccao,posto,occurred_at,es', ignoreDuplicates: true })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // Resync production_state (+ status) to the LATEST event of each affected order.
  for (const orderId of affected) {
    const { data: latest } = await service
      .from('order_production_events')
      .select('stage, occurred_at')
      .eq('order_id', orderId)
      .order('occurred_at', { ascending: false })
      .limit(1)
    const stage = latest?.[0]?.stage as string | undefined
    if (!stage) continue
    const upd: Record<string, unknown> = { production_state: stage }
    const st = statusFromStage(stage)
    if (st) upd.status = st
    await service.from('orders').update(upd).eq('id', orderId)
  }

  return NextResponse.json({
    ok: true,
    inserted: rows.length,
    affected: affected.size,
    unresolved: unresolved.length ? [...new Set(unresolved)] : undefined,
  })
}
