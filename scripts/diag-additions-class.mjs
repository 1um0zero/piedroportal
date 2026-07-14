/**
 * Mass additions validator — PORTAL side.
 *
 * Builds the class of "old portal" orders (created before the new-portal cutover
 * and still in production) and, for each, dumps the additions the PORTAL holds,
 * mapped to the A-Shell icecadd field numbers (docs/erp-additions-map.csv).
 *
 * Output: a CSV the A-Shell side reads to compare against local icecadd.
 *
 * Usage:
 *   node scripts/diag-additions-class.mjs                # summary + counts
 *   node scripts/diag-additions-class.mjs --csv > out.csv
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const CUTOVER = '2026-06-13'   // from this date on, all orders are from the new portal

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const mapCsv = readFileSync(resolve(process.cwd(), 'docs/erp-additions-map.csv'), 'utf8')
  .split('\n').slice(1).filter(Boolean).map(l => l.split(';'))
const keyToNo = {}
for (const c of mapCsv) { if (c[1] && c[7]) keyToNo[c[1]] = c[7] }

const asCsv = process.argv.includes('--csv')
const SELECT = 'id, order_seq, status, production_state, piedro_order_id, erp_order_ref, reference_customer, additions, created_at, dataverse_id'

function flatten(add) {
  const out = []
  if (!add || typeof add !== 'object') return out
  for (const [key, v] of Object.entries(add)) {
    const no = keyToNo[key]
    if (v === true) { out.push({ key, side: 'g', value: true, no }); continue }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const side of ['l', 'r']) {
        const val = v[side]
        if (val == null || val === '' || val === false) continue
        out.push({ key, side, value: val, no })
      }
    } else if (v != null && v !== '' && v !== false) {
      out.push({ key, side: 'g', value: v, no })
    }
  }
  return out
}

const main = async () => {
  // Paginate — the class can be a few hundred rows.
  let all = [], from = 0
  for (;;) {
    const { data, error } = await sb.from('orders').select(SELECT)
      .lt('created_at', CUTOVER)
      .eq('status', 'in_production')
      .order('created_at', { ascending: true })
      .range(from, from + 999)
    if (error) throw error
    all = all.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  const imported = all.filter(o => o.erp_order_ref)          // reached the console
  const notImported = all.filter(o => !o.erp_order_ref)

  if (asCsv) {
    console.log('piedro_order_id;erp_order_ref;order_seq;uuid;created;n_additions;icecadd_no;portal_key;side;value')
    for (const o of imported) {
      const flat = flatten(o.additions)
      if (!flat.length) { console.log(`${o.piedro_order_id ?? ''};${o.erp_order_ref};${o.order_seq ?? ''};${o.id};${o.created_at?.slice(0,10)};0;;;;`); continue }
      for (const f of flat) console.log(`${o.piedro_order_id ?? ''};${o.erp_order_ref};${o.order_seq ?? ''};${o.id};${o.created_at?.slice(0,10)};${flat.length};${f.no ?? ''};${f.key};${f.side};${JSON.stringify(f.value)}`)
    }
    return
  }

  const withAdd = imported.filter(o => flatten(o.additions).length)
  console.error(`Class = orders created < ${CUTOVER} AND status=in_production`)
  console.error(`  total in class ......... ${all.length}`)
  console.error(`  imported (erp_order_ref) ${imported.length}`)
  console.error(`  NOT imported yet ....... ${notImported.length}`)
  console.error(`  imported WITH additions  ${withAdd.length}   <-- these are the ones to cross-check on the VSI`)
  console.error(`  imported, no additions . ${imported.length - withAdd.length}`)
  console.error('')
  console.error('Sample (piedro / erp_order_ref / #additions / created):')
  for (const o of imported.slice(0, 20)) {
    console.error(`  ${String(o.piedro_order_id ?? '—').padEnd(8)} erp=${String(o.erp_order_ref).padEnd(10)} adds=${String(flatten(o.additions).length).padStart(2)}  ${o.created_at?.slice(0,10)}`)
  }
  console.error('\nRun with --csv to emit the full per-addition table.')
}
main().catch(e => { console.error('ERROR', e.message); process.exit(1) })
