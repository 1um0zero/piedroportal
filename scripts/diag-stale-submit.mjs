/**
 * Find orders submitted recently whose created_at is much older (draft sat for
 * days before submission) — candidates for the "order date = submission date" fix.
 * Looks at the newest order_seq numbers (seq is assigned at submission time, so
 * seq order ≈ submission order) and flags created_at outliers.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve('c:/nodejs/piedroportal/.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await sb.from('orders')
  .select('id, order_seq, status, created_at, updated_at, reference_customer, patient_name, user_id, companies(name, erp_code)')
  .not('order_seq', 'is', null)
  .order('order_seq', { ascending: false })
  .limit(40)
if (error) { console.error(error.message); process.exit(1) }

for (const o of data) {
  const c = o.created_at?.slice(0, 10), u = o.updated_at?.slice(0, 10)
  const stale = c !== u
  console.log(`#${o.order_seq}  ${o.status.padEnd(12)} created=${c}  updated=${u}${stale ? '  <-- STALE' : ''}  ref=${o.reference_customer ?? ''}  ${o.companies?.name ?? ''}`)
  if (stale) console.log(`    id=${o.id}`)
}
