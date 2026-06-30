/**
 * Backfill order sizes from Dataverse.
 *
 * The original order import (import-dataverse-orders.mjs) only read the numeric
 * fields cr56f_footsizelf / cr56f_footsizerf, which are null for the bulk of the
 * migrated orders. The real size lives in a LOOKUP to the cr56f_wpp_sizeses
 * table (_cr56f_sizelf_value / _cr56f_sizerf_value, name attr cr56f_name = "36").
 *
 * This script pulls every Dataverse order with both the numeric field and the
 * expanded lookup, resolves the size, and updates the matching Supabase order
 * (matched by orders.dataverse_id) when its size_left/size_right is null.
 *
 * Usage:
 *   node scripts/backfill-order-sizes.mjs            # dry run (no writes)
 *   node scripts/backfill-order-sizes.mjs --apply    # write to Supabase
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim())).map(([k, ...v]) => [k, v.join('=')])
)
const DV = env.DATAVERSE_URL
const API = `${DV}/api/data/v9.2`
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function token() {
  const r = await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${DV}/.default`,
    }),
  })
  return (await r.json()).access_token
}

// "36" -> 36 ; "36½" -> 36.5 ; "36,5" -> 36.5 ; non-numeric -> null
function toNum(name) {
  if (name == null) return null
  let s = String(name).trim().replace('½', '.5').replace(',', '.')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function sizeFrom(o, side) {
  // prefer the lookup name, fall back to the numeric footsize field.
  // nav property is upper-cased: cr56f_sizeLF / cr56f_sizeRF
  const look = o[`cr56f_size${side.toUpperCase()}`]?.cr56f_name
  const fromLook = toNum(look)
  if (fromLook != null) return fromLook
  return toNum(o[`cr56f_footsize${side}`])
}

async function main() {
  const tok = await token()
  const headers = { Authorization: `Bearer ${tok}`, Accept: 'application/json', Prefer: 'odata.maxpagesize=2000' }
  const select = 'cr56f_wpp_ordersid,cr56f_footsizelf,cr56f_footsizerf'
  const expand = 'cr56f_sizeLF($select=cr56f_name),cr56f_sizeRF($select=cr56f_name)'
  let url = `${API}/cr56f_wpp_orderses?$select=${select}&$expand=${expand}`

  const dvRows = []
  while (url) {
    const res = await fetch(url, { headers })
    if (!res.ok) { console.error(res.status, await res.text()); process.exit(1) }
    const j = await res.json()
    dvRows.push(...j.value)
    url = j['@odata.nextLink'] || null
  }
  console.log(`Dataverse orders fetched: ${dvRows.length}`)

  // build map id -> {l, r}
  const wanted = new Map()
  let dvHasSize = 0
  for (const o of dvRows) {
    const l = sizeFrom(o, 'lf')
    const r = sizeFrom(o, 'rf')
    if (l != null || r != null) dvHasSize++
    wanted.set(o.cr56f_wpp_ordersid.toLowerCase(), { l, r })
  }
  console.log(`Dataverse orders with a resolvable size: ${dvHasSize}`)

  // pull supabase orders that are missing size (size_left null AND size_right null)
  const targets = []
  let from = 0
  while (true) {
    const { data, error } = await sb.from('orders')
      .select('id, order_seq, dataverse_id, unit, size_left, size_right')
      .is('size_left', null).is('size_right', null)
      .not('dataverse_id', 'is', null)
      .range(from, from + 999)
    if (error) { console.error(error.message); process.exit(1) }
    targets.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`Supabase orders missing size (with dataverse_id): ${targets.length}`)

  let willUpdate = 0, noMatch = 0, noSize = 0
  const updates = []
  for (const t of targets) {
    const dv = wanted.get(String(t.dataverse_id).toLowerCase())
    if (!dv) { noMatch++; continue }
    if (dv.l == null && dv.r == null) { noSize++; continue }
    // PAIR / LEFT / RIGHT: mirror the single side onto both if one missing
    let { l, r } = dv
    if (t.unit === 'PAIR') { l = l ?? r; r = r ?? l }
    if (l == null && r == null) { noSize++; continue }
    updates.push({ id: t.id, size_left: l, size_right: r, seq: t.order_seq })
    willUpdate++
  }

  console.log(`\n→ to update: ${willUpdate}`)
  console.log(`→ no Dataverse match: ${noMatch}`)
  console.log(`→ Dataverse also had no size: ${noSize}`)
  console.log('\nsample:', updates.slice(0, 10).map(u => `#${u.seq}: L=${u.size_left} R=${u.size_right}`).join(' | '))

  if (!APPLY) { console.log('\n(dry run — pass --apply to write)'); return }

  let done = 0
  for (const u of updates) {
    const { error } = await sb.from('orders')
      .update({ size_left: u.size_left, size_right: u.size_right }).eq('id', u.id)
    if (error) { console.error(`#${u.seq}`, error.message); continue }
    done++
    if (done % 200 === 0) console.log(`updated ${done}/${updates.length}`)
  }
  console.log(`\n✅ updated ${done} orders`)
}

main()
