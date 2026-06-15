/**
 * Seed products.is_new from the old Power Pages portal's authoritative NewStyles
 * lists (hardcoded per gender in the old gallery template). KIDS + WOMEN only;
 * MEN had no NEW styles. Match is by style_name (the base before the dot).
 *
 * Run AFTER migration 031.  node scripts/seed-new-styles.mjs [--apply]
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
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Authoritative lists (style_name; base styles + explicit K variants).
const KIDS = '2212,2212K,2213,2213K,2269,2269K,2270,2270K,2272,2272K,2312,2312K,2314,2314K,2315,2316,2316K,2134,2134K,2090,2090K,2138,2138K,2091,2091K,2092,2092K,1700,1700K,1701,1701K,1702,1702K,1906,1906K,1900,1900K,1903,1903K,1901,1901K,1902,1902K,1904,1904K,1905,1905K,1800,1800K,2601,2601K'.split(',')
const WOMEN = '4400,4571,4621'.split(',')
const NEW = new Set([...KIDS, ...WOMEN])

const { data: prods } = await sb.from('products').select('id, style_name, section, is_new')
const toTrue = prods.filter(p => NEW.has(p.style_name))
const toFalse = prods.filter(p => !NEW.has(p.style_name) && p.is_new)

const split = {}
toTrue.forEach(p => { split[p.section] = (split[p.section] || 0) + 1 })
console.log(`Matching products → NEW: ${toTrue.length}`, JSON.stringify(split))
console.log(`Currently-true to clear: ${toFalse.length}`)

if (!APPLY) { console.log('\nDRY-RUN — re-run with --apply.'); process.exit(0) }

const setNew = async (ids, val) => {
  for (let i = 0; i < ids.length; i += 100) {
    await sb.from('products').update({ is_new: val }).in('id', ids.slice(i, i + 100))
  }
}
await setNew(toTrue.map(p => p.id), true)
await setNew(toFalse.map(p => p.id), false)
// Retire the interim date-based guess.
await sb.from('products').update({ new_until: null }).not('new_until', 'is', null)
console.log(`\n✅ is_new set on ${toTrue.length} products; cleared ${toFalse.length}; new_until retired.`)
