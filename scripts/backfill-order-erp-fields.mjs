/**
 * Backfill order fields the original Dataverse import skipped (matched by
 * dataverse_id). Run AFTER migrations/024 + 025. Idempotent; never overwrites
 * a non-empty portal value (portal edits win).
 *
 * What it fills:
 *   tracking_code        ← cr56f_trackingcode
 *   approval_date        ← cr56f_date_approval
 *   erp_order_ref        ← cr56f_order_production   (a-shell console order nºs)
 *   construction_left/right ← _cr56f_constructionlf/rf_value   (FormattedValue)
 *   width_left/right     ← _cr56f_widthstyleconstructionlf/rf_value (FormattedValue)
 *   size_left/right      ← _cr56f_sizelf/rf_value (FormattedValue) when still null
 *   unit + diff_sizes_pairs ← cr56f_size01..10 / cr56f_qty01..10 ("Different sizes" orders)
 *   additions: haglund_h, haglund_p, med_ank_h, lat_ank_h, pu_type, sole_type,
 *              spoiler (cr56f_6runnersolematerial), runner_sole — merged in only
 *              where the key is missing/empty.
 *
 * Usage: node scripts/backfill-order-erp-fields.mjs [--apply]
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const API = env.DATAVERSE_URL + '/api/data/v9.2'
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function token() {
  const r = await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET, scope: env.DATAVERSE_URL + '/.default' }),
  })
  return (await r.json()).access_token
}
async function fetchAll(path, t) {
  const headers = {
    Authorization: 'Bearer ' + t, Accept: 'application/json',
    Prefer: 'odata.maxpagesize=2000,odata.include-annotations=*',
  }
  let url = API + path, out = []
  while (url) { const r = await fetch(url, { headers }); if (!r.ok) throw new Error(r.status + ' ' + await r.text()); const j = await r.json(); out.push(...(j.value ?? [])); url = j['@odata.nextLink'] ?? null }
  return out
}

const sizeCols = Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(2, '0'))
const SELECT = [
  'cr56f_wpp_ordersid', 'cr56f_step',
  'cr56f_trackingcode', 'cr56f_date_approval', 'cr56f_order_production',
  '_cr56f_constructionlf_value', '_cr56f_constructionrf_value',
  '_cr56f_widthstyleconstructionlf_value', '_cr56f_widthstyleconstructionrf_value',
  '_cr56f_sizelf_value', '_cr56f_sizerf_value',
  ...sizeCols.flatMap(n => [`_cr56f_size${n}_value`, `cr56f_qty${n}`]),
  'cr56f_3haglund_height_conditionallf', 'cr56f_3haglund_height_conditionalrf',
  'cr56f_3haglund_position_conditionallf', 'cr56f_3haglund_position_conditionalrf',
  'cr56f_3mankle_height_conditionallf', 'cr56f_3mankle_height_conditionalrf',
  'cr56f_3ankle_height_conditionallf', 'cr56f_3ankle_height_conditionalrf',
  'cr56f_6puevabumperlf', 'cr56f_6puevabumperrf',
  'cr56f_6evawedgecolourlf', 'cr56f_6evawedgecolourrf',
  'cr56f_6spoilerlf', 'cr56f_6spoilerrf',
  'cr56f_6runnersolelf', 'cr56f_6runnersolerf',
].join(',')

// "½" (chr 189) in Dataverse size labels → ".5"; " 27" → "27"
const cleanSize = (s) => {
  if (s == null) return null
  const n = parseFloat(String(s).replace(/½/, '.5').trim())
  return Number.isFinite(n) ? n : null
}
const empty = (v) => v == null || v === ''
const sidedEmpty = (sv) => !sv || (empty(sv.l) && empty(sv.r))

const main = async () => {
  console.log(APPLY ? '🚀 APPLY\n' : '🔍 DRY RUN\n')
  const t = await token()

  console.log('Fetching Dataverse orders (step 3)...')
  const dv = await fetchAll(`/cr56f_wpp_orderses?$select=${SELECT}&$filter=cr56f_step eq 3`, t)
  console.log(`✓ ${dv.length} Dataverse orders`)
  const fv = (o, f) => o[`${f}@OData.Community.Display.V1.FormattedValue`] ?? null

  console.log('Fetching portal orders...')
  // Columns from migrations 024/025 — tolerated when missing (dry-run before
  // the migrations), but --apply requires them.
  let newCols = ['tracking_code', 'approval_date', 'erp_order_ref']
  const baseCols = 'id, dataverse_id, unit, construction_left, construction_right, width_left, width_right, size_left, size_right, diff_sizes_pairs, additions'
  const portal = new Map()
  for (let from = 0; ; from += 1000) {
    let res = await sb.from('orders')
      .select([baseCols, ...newCols].join(', '))
      .not('dataverse_id', 'is', null)
      .range(from, from + 999)
    if (res.error && newCols.length && /column .* does not exist/.test(res.error.message)) {
      if (APPLY) throw new Error(`${res.error.message} — run migrations 024 + 025 first.`)
      console.warn(`⚠ ${res.error.message} — migrations 024/025 not run yet; those fields are SKIPPED in this dry run.`)
      newCols = []
      res = await sb.from('orders').select(baseCols).not('dataverse_id', 'is', null).range(from, from + 999)
    }
    if (res.error) throw new Error(res.error.message)
    for (const r of res.data) portal.set(r.dataverse_id, { tracking_code: 'skip', approval_date: 'skip', erp_order_ref: 'skip', ...r })
    if (res.data.length < 1000) break
  }
  console.log(`✓ ${portal.size} portal orders with dataverse_id\n`)

  const stats = {}
  const bump = (k) => { stats[k] = (stats[k] ?? 0) + 1 }
  const patches = []

  for (const o of dv) {
    const row = portal.get(o.cr56f_wpp_ordersid)
    if (!row) continue
    const patch = {}

    if (empty(row.tracking_code) && !empty(o.cr56f_trackingcode)) { patch.tracking_code = o.cr56f_trackingcode; bump('tracking_code') }
    if (empty(row.approval_date) && !empty(o.cr56f_date_approval)) { patch.approval_date = o.cr56f_date_approval; bump('approval_date') }
    if (empty(row.erp_order_ref) && !empty(o.cr56f_order_production)) { patch.erp_order_ref = o.cr56f_order_production; bump('erp_order_ref') }

    const lookups = [
      ['construction_left', '_cr56f_constructionlf_value'], ['construction_right', '_cr56f_constructionrf_value'],
      ['width_left', '_cr56f_widthstyleconstructionlf_value'], ['width_right', '_cr56f_widthstyleconstructionrf_value'],
    ]
    for (const [col, dvf] of lookups) {
      const v = fv(o, dvf)
      if (empty(row[col]) && !empty(v)) { patch[col] = v; bump(col) }
    }
    for (const [col, dvf] of [['size_left', '_cr56f_sizelf_value'], ['size_right', '_cr56f_sizerf_value']]) {
      const v = cleanSize(fv(o, dvf))
      if (empty(row[col]) && v != null) { patch[col] = v; bump(col) }
    }

    // "Different sizes" orders: the import collapsed them to PAIR with the total.
    const pairs = []
    for (const n of sizeCols) {
      const size = cleanSize(fv(o, `_cr56f_size${n}_value`))
      const qty = o[`cr56f_qty${n}`]
      if (size != null && qty > 0) pairs.push({ qty, size })
    }
    if (pairs.length && !(row.diff_sizes_pairs?.length)) {
      patch.diff_sizes_pairs = pairs
      if (row.unit === 'PAIR') patch.unit = 'DIFF_SIZES'
      bump('diff_sizes_pairs')
    }

    // Additions the import never selected — merge in only where missing.
    const adds = row.additions ?? {}
    const addPatch = {}
    const sided = (key, lf, rf) => {
      if (empty(lf) && empty(rf)) return
      if (!sidedEmpty(adds[key])) return
      addPatch[key] = { l: lf ?? null, r: rf ?? null }
    }
    sided('haglund_h', o.cr56f_3haglund_height_conditionallf, o.cr56f_3haglund_height_conditionalrf)
    sided('haglund_p', o.cr56f_3haglund_position_conditionallf, o.cr56f_3haglund_position_conditionalrf)
    sided('med_ank_h', o.cr56f_3mankle_height_conditionallf, o.cr56f_3mankle_height_conditionalrf)
    sided('lat_ank_h', o.cr56f_3ankle_height_conditionallf, o.cr56f_3ankle_height_conditionalrf)
    sided('pu_type', fv(o, 'cr56f_6puevabumperlf'), fv(o, 'cr56f_6puevabumperrf'))
    sided('sole_type', fv(o, 'cr56f_6evawedgecolourlf'), fv(o, 'cr56f_6evawedgecolourrf'))
    sided('spoiler', fv(o, 'cr56f_6spoilerlf'), fv(o, 'cr56f_6spoilerrf'))
    sided('runner_sole', fv(o, 'cr56f_6runnersolelf'), fv(o, 'cr56f_6runnersolerf'))
    if (Object.keys(addPatch).length) {
      patch.additions = { ...adds, ...addPatch }
      bump('additions')
    }

    if (Object.keys(patch).length) patches.push({ id: row.id, patch })
  }

  console.log('── Patches to write ──────────────')
  console.log(`  Orders touched : ${patches.length}`)
  for (const [k, v] of Object.entries(stats).sort()) console.log(`  ${k.padEnd(18)}: ${v}`)

  if (!APPLY) {
    const sample = patches[0]
    if (sample) console.log('\nSample patch:', JSON.stringify(sample, null, 2).slice(0, 800))
    console.log('\n[dry-run] re-run with --apply to write.')
    return
  }

  let done = 0
  for (let i = 0; i < patches.length; i += 50) {
    await Promise.all(patches.slice(i, i + 50).map(async ({ id, patch }) => {
      const { error } = await sb.from('orders').update(patch).eq('id', id)
      if (error) { console.error(`\n❌ ${id}: ${error.message}`); process.exit(1) }
    }))
    done = Math.min(i + 50, patches.length)
    process.stdout.write(`\r  ${done}/${patches.length}`)
  }
  console.log(`\n✅ ${patches.length} orders backfilled.`)
}
main().catch(e => { console.error('❌', e.message); process.exit(1) })
