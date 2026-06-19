/**
 * Backfill orders.order_seq (the legacy NNNN order number) and seed the
 * order_seq_counter sequence. Idempotent & re-runnable after every Dataverse round.
 *
 *  1. Migrated orders (have dataverse_id): order_seq = NNNN parsed from the
 *     Dataverse cr56f_name "YYYY-MM-DD-NNNN". Only fills rows where order_seq IS NULL.
 *  2. Native portal orders (no dataverse_id): assigned, in created_at order, the
 *     numbers immediately after the legacy maximum — so they continue the sequence
 *     with no rupture and no collision with any (even unimported) legacy number.
 *  3. setval(order_seq_counter, final max) so the next submit gets max+1.
 *
 * Run AFTER migration 038. Usage: node scripts/backfill-order-numbers.mjs [--dry-run]
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb      = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DV_URL  = env.DATAVERSE_URL
const API     = `${DV_URL}/api/data/v9.2`
const DRY_RUN = process.argv.includes('--dry-run')

const parseSeq = (name) => {
  const m = String(name ?? '').match(/(\d+)\s*$/)
  return m ? parseInt(m[1], 10) : null
}

// ── 1. Pull the legacy names from Dataverse ───────────────────────────────────
console.log('Authenticating with Dataverse...')
const { access_token } = await (await fetch(
  `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
  { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${DV_URL}/.default` }) }
)).json()
const H = { Authorization: `Bearer ${access_token}`, Accept: 'application/json',
  'OData-Version': '4.0', 'OData-MaxVersion': '4.0', Prefer: 'odata.maxpagesize=500' }

let url = `${API}/cr56f_wpp_orderses?$select=cr56f_wpp_ordersid,cr56f_name`
const dvSeq = new Map()   // dataverse_id → seq
let legacyMax = 0
while (url) {
  const j = await (await fetch(url, { headers: H })).json()
  for (const o of (j.value ?? [])) {
    const seq = parseSeq(o.cr56f_name)
    if (seq != null) {
      dvSeq.set(o.cr56f_wpp_ordersid, seq)
      if (seq > legacyMax) legacyMax = seq
    }
  }
  url = j['@odata.nextLink'] ?? null
  process.stdout.write(`\r  fetched ${dvSeq.size} names`)
}
console.log(`\n✓ ${dvSeq.size} legacy names | legacy MAX = ${legacyMax}`)

// ── 2. Load all portal orders ─────────────────────────────────────────────────
const orders = []
{
  let from = 0
  const PAGE = 1000
  for (;;) {
    const { data, error } = await sb.from('orders')
      .select('id, dataverse_id, order_seq, created_at, status')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) { console.error(error); process.exit(1) }
    orders.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
}
console.log(`✓ ${orders.length} portal orders loaded`)

// ── 3. Compute assignments ────────────────────────────────────────────────────
const updates = []        // { id, order_seq }
let migratedFilled = 0, migratedMissing = 0, alreadySet = 0

let skippedDrafts = 0
for (const o of orders) {
  if (o.order_seq != null) { alreadySet++; continue }
  // Drafts are unfinished — a number is consumed only on SUBMIT, never for a draft.
  if (o.status === 'draft') { skippedDrafts++; continue }
  if (o.dataverse_id && dvSeq.has(o.dataverse_id)) {
    updates.push({ id: o.id, order_seq: dvSeq.get(o.dataverse_id) }); migratedFilled++
  } else if (o.dataverse_id) {
    migratedMissing++   // migrated but no name in DV — handle as native below
  }
}

// Native (no dataverse_id) + migrated-without-name: continue the sequence by created_at.
// Drafts already excluded above. Start from the higher of the legacy max and the
// max already assigned in the DB, so re-runs continue past existing numbers (never
// reuse a number a previous run already handed out).
const dbMax = orders.reduce((m, o) => (o.order_seq != null && o.order_seq > m ? o.order_seq : m), 0)
let next = Math.max(legacyMax, dbMax)
const continuationStart = next + 1
const natives = orders
  .filter(o => o.order_seq == null && o.status !== 'draft' && (!o.dataverse_id || !dvSeq.has(o.dataverse_id)))
  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
for (const o of natives) updates.push({ id: o.id, order_seq: ++next })
const finalMax = Math.max(legacyMax, next)

console.log('\n── Plan ──────────────────────────────────────')
console.log(`  already numbered      : ${alreadySet}`)
console.log(`  skipped drafts        : ${skippedDrafts}  (stay unnumbered until submit)`)
console.log(`  migrated → from DV name: ${migratedFilled}`)
console.log(`  migrated, no DV name   : ${migratedMissing}  (numbered as continuation)`)
console.log(`  native → continuation  : ${natives.length}  (${continuationStart} … ${next})`)
console.log(`  TOTAL to update        : ${updates.length}`)
console.log(`  sequence will setval to: ${finalMax}`)

if (DRY_RUN) { console.log('\n[dry-run] no writes. sample:', updates.slice(0, 5)); process.exit(0) }

// ── 4. Apply ──────────────────────────────────────────────────────────────────
console.log('\nUpdating...')
let done = 0
for (const u of updates) {
  const { error } = await sb.from('orders').update({ order_seq: u.order_seq }).eq('id', u.id)
  if (error) { console.error(`\n❌ ${u.id}: ${error.message}`); process.exit(1) }
  if (++done % 100 === 0) process.stdout.write(`\r  ${done}/${updates.length}`)
}
console.log(`\r  ${done}/${updates.length} updated`)

// ── 5. Seed the sequence (so next submit = finalMax + 1) ──────────────────────
const { error: setErr } = await sb.rpc('set_order_seq_counter', { new_val: finalMax })
if (setErr) {
  console.log(`\n⚠ Could not setval via RPC (${setErr.message}).`)
  console.log(`  Run this once in the Supabase SQL editor:`)
  console.log(`    SELECT setval('order_seq_counter', ${finalMax}, true);`)
} else {
  console.log(`✓ order_seq_counter set to ${finalMax}`)
}
console.log('\n✅ Done.')
