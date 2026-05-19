/**
 * Populate the `sibling` column based on the K-suffix rule:
 *   "1900"  → sibling = "1900K" (if exists in DB)
 *   "1900K" → sibling = "1900"  (if exists in DB)
 * Only updates rows where sibling IS NULL (doesn't overwrite manual entries).
 *
 * Usage: node scripts/populate-siblings.mjs [--dry-run]
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
const DRY_RUN = process.argv.includes('--dry-run')

// ── Fetch all active style names ──────────────────────────────────────────────
const { data: allProducts } = await sb
  .from('products')
  .select('id, style_name, sibling')
  .eq('active', true)

const styleSet = new Set(allProducts.map(p => p.style_name))

// ── Compute updates ───────────────────────────────────────────────────────────
const updates = []

for (const p of allProducts) {
  if (p.sibling !== null) continue    // already set manually — skip

  const sn = p.style_name
  const candidate = sn.endsWith('K') ? sn.slice(0, -1) : sn + 'K'

  if (styleSet.has(candidate)) {
    updates.push({ id: p.id, style_name: sn, sibling: candidate })
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
const pairs = new Map()
updates.forEach(u => {
  const key = [u.style_name, u.sibling].sort().join(' ↔ ')
  pairs.set(key, (pairs.get(key) ?? 0) + 1)
})

console.log(`${updates.length} products to update (${pairs.size} unique style pairs)`)
console.log('\nPairs (first 10):')
;[...pairs.entries()].slice(0, 10).forEach(([k, n]) => console.log(`  ${k}  (${n} variants)`))

if (DRY_RUN) {
  console.log('\n[dry-run] No changes written.')
  process.exit(0)
}

// ── Apply ─────────────────────────────────────────────────────────────────────
console.log('\nApplying...')
let done = 0
for (const u of updates) {
  const { error } = await sb.from('products').update({ sibling: u.sibling }).eq('id', u.id)
  if (error) { console.error('Error:', u.id, error.message); continue }
  done++
  if (done % 100 === 0) process.stdout.write(`\r  ${done}/${updates.length}`)
}
console.log(`\r✅  ${done} products updated`)
