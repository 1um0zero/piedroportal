/**
 * Validate an order's additions: dump what the PORTAL holds for a given order_seq
 * (or piedro/erp/reference identifier), exploded to the stable ERP contract shape
 * and mapped to the A-Shell icecadd field numbers (docs/erp-additions-map.csv).
 *
 * This is the PORTAL side of the "additions in falta na VSI" validation. Compare
 * the printed rows against what the SHUZ console order actually has in icecadd.
 *
 * Usage: node scripts/diag-additions-47414.mjs 47414 [more ids...]
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

// Map portal_key -> icecadd field no, from docs/erp-additions-map.csv
const mapCsv = readFileSync(resolve(process.cwd(), 'docs/erp-additions-map.csv'), 'utf8')
  .split('\n').slice(1).filter(Boolean).map(l => l.split(';'))
const keyToNo = {}
for (const c of mapCsv) { if (c[1] && c[7]) keyToNo[c[1]] = c[7] }

const SELECT = 'id, order_seq, status, approval_state, production_state, piedro_order_id, erp_order_ref, reference_customer, patient_name, additions, created_at'
const ids = process.argv.slice(2)
if (!ids.length) { console.error('give an order_seq'); process.exit(1) }

const main = async () => {
  for (const raw of ids) {
    const id = raw.trim()
    const seq = /^\d+$/.test(id) ? Number(id) : null
    const ors = [`piedro_order_id.eq.${id}`, `erp_order_ref.eq.${id}`, `reference_customer.eq.${id}`]
    if (seq != null) ors.push(`order_seq.eq.${seq}`)
    const { data, error } = await sb.from('orders').select(SELECT).or(ors.join(','))
    if (error) throw error
    if (!data?.length) { console.log(`\n${id}: no match`); continue }
    for (const o of data) {
      console.log(`\n══ order_seq #${o.order_seq}  uuid=${o.id} ══`)
      console.log(`   piedro=${o.piedro_order_id ?? '—'}  erp_order_ref=${o.erp_order_ref ?? '—'}  ref_cliente=${o.reference_customer ?? '—'}`)
      console.log(`   patient=${o.patient_name ?? '—'}  status=${o.status}  created=${o.created_at?.slice(0,10)}`)
      const add = o.additions
      if (!add || typeof add !== 'object') { console.log('   additions JSONB: EMPTY/null'); continue }
      const flat = flatten(add, keyToNo)
      if (!flat.length) { console.log('   additions JSONB present but NO active items'); continue }
      console.log(`   ${flat.length} addition(s) active in the portal:`)
      for (const f of flat) console.log(`     [icecadd ${f.no ?? '???'}] ${f.key}${f.side} = ${JSON.stringify(f.value)}`)
    }
  }
}

// Standalone flatten (mirrors explodeAdditions, but without needing the TS config).
function flatten(add, keyToNo) {
  const out = []
  for (const [key, v] of Object.entries(add)) {
    const no = keyToNo[key]
    if (v === true) { out.push({ key, side: '', value: true, no }); continue }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const side of ['l', 'r']) {
        const val = v[side]
        if (val == null || val === '' || val === false) continue
        out.push({ key, side: `[${side}]`, value: val, no })
      }
    } else if (v != null && v !== '' && v !== false) {
      out.push({ key, side: '', value: v, no })
    }
  }
  return out
}
main().catch(e => { console.error('ERROR', e.message); process.exit(1) })
