/**
 * One-off diagnostic for the Piedro Ltd (UK) exclusivity question.
 *  - Companies carrying UK or LIV: exclusive_label + sees_general_catalogue
 *  - company_exclusives rows for those companies
 *  - The 4 colours of style 2089: colour_id, color_name, active, exclusive
 * Usage: node scripts/diag-exclusive-2089.mjs
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

console.log('\n=== Companies with UK or LIV in exclusive_label ===')
const { data: comps, error: cErr } = await sb.from('companies')
  .select('id, name, exclusive_label, sees_general_catalogue')
  .or('exclusive_label.ilike.%UK%,exclusive_label.ilike.%LIV%')
if (cErr) { console.error('companies error:', cErr.message) }
else for (const c of comps) {
  console.log(`  ${c.name.padEnd(28)} label="${c.exclusive_label}"  sees_general=${c.sees_general_catalogue}`)
}

console.log('\n=== company_exclusives rows for UK / LIV ===')
const { data: ce, error: ceErr } = await sb.from('company_exclusives')
  .select('company_id, sigla, companies(name)')
  .in('sigla', ['UK', 'LIV'])
if (ceErr) console.error('company_exclusives error:', ceErr.message)
else for (const r of ce) console.log(`  ${r.sigla}  ${r.companies?.name ?? r.company_id}`)

console.log('\n=== Style 2089 colours ===')
const { data: prods, error: pErr } = await sb.from('products')
  .select('colour_id, style_name, color_name, active, exclusive')
  .eq('style_name', '2089')
  .order('colour_id')
if (pErr) console.error('products error:', pErr.message)
else for (const p of prods) {
  console.log(`  ${p.colour_id}  ${(p.color_name ?? '').padEnd(22)} active=${p.active}  exclusive="${p.exclusive ?? ''}"`)
}
console.log('')
