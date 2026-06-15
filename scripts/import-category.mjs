/**
 * Import products.category from Dataverse style cr56f_category (1..10), matched
 * by style_name. Powers the gallery category filter + piedro.com deep links.
 * Run AFTER migration 032.  node scripts/import-category.mjs [--apply]
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

const tok = await (await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${env.DATAVERSE_URL}/.default` }),
})).json()
const H = { Authorization: `Bearer ${tok.access_token}` }

const c = await (await fetch(`${env.DATAVERSE_URL}/api/data/v9.2/cr56f_wpp_styleses?$select=cr56f_category,cr56f_name&$top=5000`, { headers: H })).json()
const catByStyle = {}
for (const x of c.value || []) if (x.cr56f_name && x.cr56f_category != null) catByStyle[String(x.cr56f_name)] = Number(x.cr56f_category)

// Paginate products (Supabase caps at 1000/select).
const prods = []
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('products').select('id, style_name, category').order('id').range(from, from + 999)
  if (!data?.length) break
  prods.push(...data); if (data.length < 1000) break
}

const updates = prods
  .map(p => ({ id: p.id, category: catByStyle[String(p.style_name)] ?? null }))
  .filter(u => u.category != null)
const dist = {}
updates.forEach(u => { dist[u.category] = (dist[u.category] || 0) + 1 })
console.log(`Products with a category: ${updates.length} / ${prods.length}`)
console.log('distribution:', JSON.stringify(dist))

if (!APPLY) { console.log('\nDRY-RUN — re-run with --apply.'); process.exit(0) }

// Group by category value for batched updates.
const byCat = {}
for (const u of updates) (byCat[u.category] ??= []).push(u.id)
let done = 0
for (const [cat, ids] of Object.entries(byCat)) {
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await sb.from('products').update({ category: Number(cat) }).in('id', ids.slice(i, i + 200))
    if (!error) done += Math.min(200, ids.length - i)
  }
}
console.log(`\n✅ category set on ${done} products.`)
