/**
 * Mark the NEW product families as new_until = NULL (unlimited).
 * Run AFTER adding the column to Supabase:
 *   ALTER TABLE products ADD COLUMN IF NOT EXISTS new_until TIMESTAMPTZ DEFAULT NULL;
 *
 * Usage: node scripts/mark-new-products.mjs
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Families to mark as NEW (NULL = no expiry = unlimited)
const PREFIXES = ['4400', '4571', '4621']

const { data, error } = await sb
  .from('products')
  .select('id, style_name')
  .or(PREFIXES.map(p => `style_name.like.${p}%`).join(','))

if (error) { console.error('Fetch error:', error.message); process.exit(1) }
console.log(`Found ${data.length} products to mark as NEW:`, [...new Set(data.map(p=>p.style_name))].join(', '))

const ids = data.map(p => p.id)
// NULL = not new (default). Use far-future date for "unlimited" new status.
const UNLIMITED = '2099-01-01T00:00:00+00:00'

const { error: e2 } = await sb
  .from('products')
  .update({ new_until: UNLIMITED })
  .in('id', ids)

if (e2) {
  // Column may not exist yet
  if (e2.message?.includes('new_until')) {
    console.error('\n❌  Column "new_until" not found in Supabase.')
    console.error('   Run this SQL in the Supabase dashboard first:')
    console.error('   ALTER TABLE products ADD COLUMN IF NOT EXISTS new_until TIMESTAMPTZ DEFAULT NULL;')
  } else {
    console.error('Update error:', e2.message)
  }
  process.exit(1)
}

console.log(`\n✅  ${ids.length} products marked as new_until = 2099-01-01 (unlimited)`)
console.log('   They will show the NEW badge in the gallery.')
console.log('\n   To set an expiry date:')
console.log("   UPDATE products SET new_until = '2026-09-01' WHERE style_name LIKE '4400%';")
console.log('\n   To remove NEW status:')
console.log("   UPDATE products SET new_until = NULL WHERE style_name LIKE '4400%';")
