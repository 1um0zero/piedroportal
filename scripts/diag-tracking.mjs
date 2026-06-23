/**
 * Diagnose why a Track & Trace code/link is (not) showing in the portal for a
 * given set of orders. Looks each identifier up across the fields the orders
 * list/detail use and prints the tracking-relevant state.
 *
 * Why it matters: the portal only surfaces tracking once the ERP/A-Shell has
 * pushed `delivered` + a `tracking_link`. The Delivery column hides the code
 * when status != delivered (it shows the dispatch countdown instead), and an
 * order delivered WITHOUT a link shows only the truck (no number). This script
 * tells you which of those each order is in.
 *
 * Usage:
 *   node scripts/diag-tracking.mjs VX58812-348910 VX59726-160330 ...
 *   node scripts/diag-tracking.mjs            # no args → recent delivered sample
 *
 * Each identifier is matched against piedro_order_id, erp_order_ref,
 * reference_customer and order_seq (numeric).
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

const SELECT = 'id, order_seq, status, approval_state, production_state, piedro_order_id, erp_order_ref, reference_customer, tracking_code, tracking_link, expected_dispatch_date, created_at'

const ids = process.argv.slice(2)

function verdict(o) {
  const delivered = o.status === 'delivered' || o.production_state === 'delivered'
  if (!delivered) return `NOT delivered (status=${o.status}, production_state=${o.production_state ?? '—'}) → list shows dispatch countdown / dash, no tracking`
  if (!o.tracking_link && !o.tracking_code) return 'delivered but NO tracking_link/code from ERP → list shows truck only'
  if (!o.tracking_link) return 'delivered, tracking_code present but NO link → detail shows code, list shows truck only'
  return 'OK — tracking_link present → code shows in list (Delivery) and order detail'
}

function show(o) {
  console.log(`\n#${o.order_seq ?? '—'}  piedro=${o.piedro_order_id ?? '—'}  erp=${o.erp_order_ref ?? '—'}`)
  console.log(`   status=${o.status}  approval=${o.approval_state ?? '—'}  production=${o.production_state ?? '—'}`)
  console.log(`   tracking_code=${o.tracking_code ?? '—'}`)
  console.log(`   tracking_link=${o.tracking_link ?? '—'}`)
  console.log(`   expected_dispatch=${o.expected_dispatch_date ?? '—'}`)
  console.log(`   → ${verdict(o)}`)
}

const main = async () => {
  if (ids.length === 0) {
    const { data, error } = await sb.from('orders').select(SELECT)
      .or('status.eq.delivered,production_state.eq.delivered')
      .order('created_at', { ascending: false }).limit(15)
    if (error) throw error
    console.log(`Recent delivered orders (${data.length}):`)
    data.forEach(show)
    const withLink = data.filter(o => o.tracking_link).length
    console.log(`\nSummary: ${withLink}/${data.length} delivered orders have a tracking_link.`)
    return
  }

  for (const raw of ids) {
    const id = raw.trim()
    const seq = /^\d+$/.test(id) ? Number(id) : null
    const ors = [`piedro_order_id.eq.${id}`, `erp_order_ref.eq.${id}`, `reference_customer.eq.${id}`]
    if (seq != null) ors.push(`order_seq.eq.${seq}`)
    const { data, error } = await sb.from('orders').select(SELECT).or(ors.join(','))
    if (error) throw error
    if (!data || data.length === 0) { console.log(`\n${id}: ❌ no matching order found`); continue }
    console.log(`\n══ ${id} (${data.length} match) ══`)
    data.forEach(show)
  }
}
main().catch(e => { console.error('❌', e.message); process.exit(1) })
