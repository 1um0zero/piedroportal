/**
 * Normalise type and color_basic values in Supabase products table.
 * Fixes: Dutch→English, case inconsistencies, trailing spaces, "Multi"→"Multi Colour"
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

// ── Type map ─────────────────────────────────────────────────────────────────
const TYPE_MAP = {
  'boot': 'Boot', 'boots': 'Boot',
  'shoe': 'Shoes', 'shoes': 'Shoes',
  'sandal': 'Sandal', 'sandals': 'Sandal',
}

// ── Colour map (old value → normalised English) ───────────────────────────────
const COLOUR_MAP = {
  'Beige': 'Beige',
  'Beige ': 'Beige',
  'Beige, Multi': 'Beige, Multi Colour',
  'Beige, Multi Colour': 'Beige, Multi Colour',
  'Beige, Multi colour': 'Beige, Multi Colour',
  'Black': 'Black',
  'Black, Multi Colour': 'Black, Multi Colour',
  'Black, Multi colour': 'Black, Multi Colour',
  'Blauw': 'Blue',
  'Blauw, Kobalt': 'Cobalt Blue',
  'Blauw, Multi': 'Blue, Multi Colour',
  'Blue': 'Blue',
  'Blue, Multi Colour': 'Blue, Multi Colour',
  'Blue, Multi colour': 'Blue, Multi Colour',
  'Brown': 'Brown',
  'Brown, Multi Colour': 'Brown, Multi Colour',
  'Brown, Multi colour': 'Brown, Multi Colour',
  'Bruin': 'Brown',
  'Bruin, Multi': 'Brown, Multi Colour',
  'Fuchsia': 'Fuchsia',
  'Geel': 'Yellow',
  'Green': 'Green',
  'Green, Multi Colour': 'Green, Multi Colour',
  'Grey': 'Grey',
  'Grey, Multi Colour': 'Grey, Multi Colour',
  'Grijs': 'Grey',
  'Grijs, Multi': 'Grey, Multi Colour',
  'Grijs, Roze': 'Grey, Pink',
  'Grijs, Wit': 'Grey, White',
  'Grijs, Zwart': 'Grey, Black',
  'Groen': 'Green',
  'Groen, Blauw, Wit': 'Green, Blue, White',
  'Groen, Multi': 'Green, Multi Colour',
  'Groen, Wit': 'Green, White',
  'Groen, Zwart': 'Green, Black',
  'Kobalt, Blauw': 'Cobalt Blue',
  'Paars': 'Purple',
  'Paars, Beige': 'Purple, Beige',
  'Pink': 'Pink',
  'Pink, Multi Colour': 'Pink, Multi Colour',
  'Purple': 'Purple',
  'Red': 'Red',
  'Rood': 'Red',
  'Roze': 'Pink',
  'Roze Off, White': 'Pink, Off-White',
  'Roze, Beige, Multi': 'Pink, Beige, Multi Colour',
  'Roze, Multi': 'Pink, Multi Colour',
  'White': 'White',
  'White, Beige': 'White, Beige',
  'White, Beige, Multi Colour': 'White, Beige, Multi Colour',
  'White, Multi Colour': 'White, Multi Colour',
  'Wit': 'White',
  'Wit, Multi': 'White, Multi Colour',
  'Wit, Zwart': 'White, Black',
  'Zwart': 'Black',
  'Zwart, Grijs': 'Black, Grey',
  'Zwart, Groen': 'Black, Green',
  'Zwart, Multi': 'Black, Multi Colour',
  'Zwart, Rood': 'Black, Red',
  'Zwart, Wit': 'Black, White',
  'Zwart, Wit, Blauw': 'Black, White, Blue',
  'black': 'Black',
  'white': 'White',
}

// ── Fetch all products ────────────────────────────────────────────────────────
console.log('Fetching products...')
let all = [], offset = 0
while (true) {
  const { data } = await sb.from('products').select('id,type,color_basic').range(offset, offset + 999)
  if (!data?.length) break
  all = all.concat(data)
  if (data.length < 1000) break
  offset += 1000
}
console.log(`${all.length} products loaded\n`)

// ── Build updates ─────────────────────────────────────────────────────────────
const updates = []
for (const p of all) {
  const newType   = TYPE_MAP[p.type?.toLowerCase()] ?? p.type
  const newColour = COLOUR_MAP[p.color_basic] ?? p.color_basic?.trim() ?? p.color_basic

  if (newType !== p.type || newColour !== p.color_basic) {
    updates.push({ id: p.id, type: newType, color_basic: newColour })
  }
}

console.log(`${updates.length} records to update`)

// Show what will change
const typeChanges = new Map()
const colourChanges = new Map()
for (const u of updates) {
  const orig = all.find(p => p.id === u.id)
  if (orig.type !== u.type) typeChanges.set(`${orig.type} → ${u.type}`, (typeChanges.get(`${orig.type} → ${u.type}`) || 0) + 1)
  if (orig.color_basic !== u.color_basic) colourChanges.set(`${orig.color_basic} → ${u.color_basic}`, (colourChanges.get(`${orig.color_basic} → ${u.color_basic}`) || 0) + 1)
}

console.log('\nType changes:')
for (const [k, v] of [...typeChanges].sort()) console.log(`  ${v}x  ${k}`)
console.log('\nColour changes:')
for (const [k, v] of [...colourChanges].sort()) console.log(`  ${v}x  ${k}`)

// ── Apply in batches of 50 ────────────────────────────────────────────────────
console.log('\nApplying...')
let done = 0
for (const u of updates) {
  const { error } = await sb.from('products').update({ type: u.type, color_basic: u.color_basic }).eq('id', u.id)
  if (error) { console.error('Error:', u.id, error.message); continue }
  done++
  if (done % 100 === 0) process.stdout.write(`\r  ${done}/${updates.length}`)
}
console.log(`\r✅  ${done} records updated`)

// ── Final distinct values ─────────────────────────────────────────────────────
const { data: final } = await sb.from('products').select('type,color_basic').eq('active', true)
const types   = [...new Set(final.map(p => p.type))].sort()
const colours = [...new Set(final.map(p => p.color_basic).filter(Boolean))].sort()
console.log('\nFinal types:', types)
console.log(`Final colours (${colours.length}):`, colours)
