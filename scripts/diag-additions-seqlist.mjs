/**
 * Mass additions validator — PORTAL side, driven by an explicit list of orders.
 *
 * Input: a text file with one order per line in the "online" name format
 * (YYYY-MM-DD-NNNN, NNNN = order_seq) or a bare order_seq. Duplicates ignored.
 *
 * For each order it prints the additions the PORTAL holds, mapped to the A-Shell
 * icecadd field numbers (docs/erp-additions-map.csv), and (with --csv) emits the
 * per-addition table the A-Shell side reads to compare against local icecadd.
 *
 * Usage:
 *   node scripts/diag-additions-seqlist.mjs scripts/_seqs-47414-class.txt
 *   node scripts/diag-additions-seqlist.mjs scripts/_seqs-47414-class.txt --csv > out.csv
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const asCsv = args.includes('--csv')
const file = args.find(a => !a.startsWith('--'))
if (!file) { console.error('usage: node diag-additions-seqlist.mjs <file> [--csv]'); process.exit(1) }

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const mapCsv = readFileSync(resolve(process.cwd(), 'docs/erp-additions-map.csv'), 'utf8')
  .split('\n').slice(1).filter(Boolean).map(l => l.split(';'))
const keyToNo = {}, keyToSlot = {}
for (const c of mapCsv) { if (c[1]) { if (c[7]) keyToNo[c[1]] = c[7]; if (c[8]) keyToSlot[c[1]] = c[8] } }

// Parse the list → unique order_seq numbers (last dash-group, or a bare number).
const seqs = [...new Set(
  readFileSync(resolve(process.cwd(), file), 'utf8')
    .split('\n').map(l => l.trim()).filter(Boolean)
    .map(l => { const m = l.match(/(\d+)\s*$/); return m ? Number(m[1]) : null })
    .filter(n => n != null)
)]

const SELECT = 'id, order_seq, status, production_state, piedro_order_id, erp_order_ref, reference_customer, patient_name, additions, created_at'

function flatten(add) {
  const out = []
  if (!add || typeof add !== 'object') return out
  for (const [key, v] of Object.entries(add)) {
    const no = keyToNo[key], slot = keyToSlot[key]
    if (v === true) { out.push({ key, side: 'g', value: true, no, slot }); continue }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const side of ['l', 'r']) {
        const val = v[side]
        if (val == null || val === '' || val === false) continue
        out.push({ key, side, value: val, no, slot })
      }
    } else if (v != null && v !== '' && v !== false) {
      out.push({ key, side: 'g', value: v, no, slot })
    }
  }
  return out
}

const main = async () => {
  // Fetch in chunks by order_seq.
  let rows = []
  for (let i = 0; i < seqs.length; i += 200) {
    const chunk = seqs.slice(i, i + 200)
    const { data, error } = await sb.from('orders').select(SELECT).in('order_seq', chunk)
    if (error) throw error
    rows = rows.concat(data)
  }
  const bySeq = new Map(rows.map(o => [o.order_seq, o]))
  const missing = seqs.filter(s => !bySeq.has(s))

  if (asCsv) {
    console.log('order_seq;piedro_order_id;erp_order_ref;uuid;created;n_additions;icecadd_no;icecadd2_slot;portal_key;side;value')
    for (const s of seqs) {
      const o = bySeq.get(s)
      if (!o) { console.log(`${s};;;;;NOT_FOUND;;;;;`); continue }
      const flat = flatten(o.additions)
      if (!flat.length) { console.log(`${s};${o.piedro_order_id ?? ''};${o.erp_order_ref ?? ''};${o.id};${o.created_at?.slice(0,10)};0;;;;;`); continue }
      for (const f of flat) console.log(`${s};${o.piedro_order_id ?? ''};${o.erp_order_ref ?? ''};${o.id};${o.created_at?.slice(0,10)};${flat.length};${f.no ?? ''};${f.slot ?? ''};${f.key};${f.side};${JSON.stringify(f.value)}`)
    }
    return
  }

  let withAdd = 0, noAdd = 0, noErp = 0
  console.error(`List: ${seqs.length} unique order_seq  (found ${rows.length}, missing ${missing.length})`)
  if (missing.length) console.error(`  order_seq not in portal: ${missing.join(', ')}`)
  console.error('')
  console.error('order_seq  piedro     erp_order_ref        adds  created     additions')
  for (const s of seqs) {
    const o = bySeq.get(s)
    if (!o) continue
    const flat = flatten(o.additions)
    if (flat.length) withAdd++; else noAdd++
    if (!o.erp_order_ref) noErp++
    const summary = flat.map(f => `${f.key}${f.side==='g'?'':'['+f.side+']'}=${f.value}`).join(', ')
    console.error(`${String(s).padEnd(9)}  ${String(o.piedro_order_id ?? '—').padEnd(9)}  ${String(o.erp_order_ref ?? '—').padEnd(19)}  ${String(flat.length).padStart(3)}  ${o.created_at?.slice(0,10)}  ${summary}`)
  }
  console.error('')
  console.error(`SUMMARY: ${withAdd} orders WITH additions (to cross-check on VSI), ${noAdd} without. ${noErp} not yet imported (no erp_order_ref).`)
  console.error('Run with --csv > out.csv for the per-addition table.')
}
main().catch(e => { console.error('ERROR', e.message); process.exit(1) })
