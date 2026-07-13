/**
 * List orders on ZSM (B-prefix) models whose sizes don't exist in the ZSM
 * catalogue (Anabela e-mail 2026-07-13):
 *   WOMEN 36-43 except 39.5, 41.5 · MEN 38-48 except 38.5, 41.5, 43.5, 45.5
 * Usage: node scripts/diag-zsm-invalid-sizes.mjs
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

const EXCLUDED = { WOMEN: [39.5, 41.5], MEN: [38.5, 41.5, 43.5, 45.5] }

const { data: products, error: pErr } = await sb.from('products')
  .select('id, style_name, colour_id, section, size_first, size_last')
  .ilike('style_name', 'B%')
if (pErr) { console.error(pErr.message); process.exit(1) }
const byId = new Map(products.map(p => [p.id, p]))

function invalid(p, size) {
  if (size == null) return false
  if (size < p.size_first || size > p.size_last) return true
  return (EXCLUDED[p.section] ?? []).includes(size)
}

// Orders on ZSM products, paged (fetch-all rule)
const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('orders')
    .select('id, order_seq, status, created_at, product_id, size_left, size_right, diff_sizes_pairs, patient_name, reference_customer')
    .in('product_id', products.map(p => p.id))
    .range(from, from + 999)
  if (error) { console.error(error.message); process.exit(1) }
  rows.push(...data)
  if (data.length < 1000) break
}

let bad = 0
for (const o of rows.sort((a, b) => (a.order_seq ?? 0) - (b.order_seq ?? 0))) {
  const p = byId.get(o.product_id)
  const problems = []
  if (invalid(p, o.size_left))  problems.push(`L=${o.size_left}`)
  if (invalid(p, o.size_right)) problems.push(`R=${o.size_right}`)
  for (const pair of o.diff_sizes_pairs ?? [])
    if (invalid(p, pair.size)) problems.push(`diff=${pair.size}`)
  if (!problems.length) continue
  bad++
  console.log([
    `#${o.order_seq ?? '—'}`, o.status, o.created_at?.slice(0, 10),
    p.colour_id, p.section, problems.join(' '), o.reference_customer ?? '',
  ].join('  '))
}
console.log(`\n${bad} order(s) with non-existent ZSM sizes (of ${rows.length} ZSM orders)`)
