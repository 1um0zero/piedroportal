/**
 * One-off: converge the deleted_orders content-archive into the log-only model.
 * For every row in deleted_orders:
 *   1. write an admin_actions `order_delete` entry with IDENTIFIERS ONLY (no content),
 *      so the "this order existed and was deleted" trace survives;
 *   2. delete its orphan PDF from the order-pdfs bucket (no retained content).
 * After this runs clean, apply migration 055 to drop the deleted_orders table.
 *
 *   node scripts/cleanup-deleted-orders.mjs           # dry-run
 *   node scripts/cleanup-deleted-orders.mjs --apply   # write log + delete PDFs
 *
 * Idempotent: skips an order already logged (details.deleted_order_id) and a PDF already gone.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const APPLY = process.argv.includes('--apply')

const { data: rows, error } = await sb.from('deleted_orders').select('*')
if (error) { console.error('read deleted_orders failed (already dropped?):', error.message); process.exit(1) }
console.log(`deleted_orders rows: ${rows.length}`)

// existing order_delete logs, to stay idempotent
const { data: logged } = await sb.from('admin_actions').select('details').eq('action', 'order_delete')
const already = new Set((logged ?? []).map(l => l.details?.deleted_order_id).filter(Boolean))

let wroteLogs = 0, delPdfs = 0
for (const r of rows) {
  const existedAt = r.snapshot?.pdf_created_at ?? null
  // 1) log entry (identifiers only) — these are HISTORICAL deletions: the real deleter
  //    and delete-time are unknown (predate the delete audit), so actor is null and we
  //    note when the order is known to have existed (its PDF's creation time).
  if (already.has(r.order_id)) {
    console.log(`skip log  #${r.order_seq ?? '—'} ${r.order_id} (already logged)`)
  } else {
    console.log(`${APPLY ? 'LOG  ' : 'plan '} #${r.order_seq ?? '—'}  ${r.reference_customer ?? '—'} / ${r.patient_name ?? '—'}`)
    if (APPLY) {
      const { error: e } = await sb.from('admin_actions').insert({
        actor_id: null,
        actor_role: null,
        action: 'order_delete',
        order_id: null,
        details: {
          deleted_order_id: r.order_id,
          order_seq: r.order_seq,
          status: r.snapshot?.kind === 'test' ? 'test' : 'submitted',
          patient_name: r.patient_name ?? null,
          reference_customer: r.reference_customer ?? null,
          existed_at: existedAt,
          note: 'Historical deletion reconstructed from orphan PDF before content purge; actual deleter/delete-time unknown (predates delete audit).',
        },
      })
      if (e) { console.error('  LOG ERROR', e.message); continue }
      wroteLogs++
    }
  }
  // 2) delete the orphan PDF
  const path = r.pdf_url ?? `${r.order_id}.pdf`
  if (APPLY) {
    const { error: e } = await sb.storage.from('order-pdfs').remove([path])
    if (e) console.error(`  PDF remove failed ${path}:`, e.message)
    else { console.log(`  deleted PDF ${path}`); delPdfs++ }
  } else {
    console.log(`  plan delete PDF ${path}`)
  }
}
console.log(`\n${APPLY ? `logged ${wroteLogs}, deleted ${delPdfs} PDFs` : 'dry-run (pass --apply)'}. Then run migration 055 to drop deleted_orders.`)
