/**
 * Import adds_exclude and exclusive fields from Dataverse styles → Supabase products
 * Run AFTER: ALTER TABLE products ADD COLUMN IF NOT EXISTS adds_exclude TEXT DEFAULT '';
 *            ALTER TABLE products ADD COLUMN IF NOT EXISTS exclusive TEXT DEFAULT '';
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

const { access_token } = await (await fetch(
  `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
  { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${env.DATAVERSE_URL}/.default` }) }
)).json()

const API = `${env.DATAVERSE_URL}/api/data/v9.2`
const H = { Authorization: `Bearer ${access_token}`, Accept: 'application/json', 'OData-Version': '4.0', Prefer: 'odata.maxpagesize=500' }

// Fetch all styles with adds_exclude and exclusive
console.log('Fetching styles from Dataverse...')
const byStyleName = {}
let url = `${API}/cr56f_wpp_styleses?$select=cr56f_name,cr56f_adds_exclude,cr56f_exclusive`

while (url) {
  const res = await fetch(url, { headers: H })
  const json = await res.json()
  for (const s of json.value ?? []) {
    if (s.cr56f_name && !byStyleName[s.cr56f_name]) {
      byStyleName[s.cr56f_name] = {
        adds_exclude: s.cr56f_adds_exclude ?? '',
        exclusive:    s.cr56f_exclusive ?? '',
      }
    }
  }
  url = json['@odata.nextLink'] ?? null
  process.stdout.write(`\r  Fetched ${Object.keys(byStyleName).length} styles...`)
}
console.log(`\n✓ ${Object.keys(byStyleName).length} distinct styles\n`)

// Fetch all products
const { data: products } = await sb.from('products').select('id, style_name').order('style_name')
console.log(`Processing ${products?.length} products...`)

let updated = 0, skipped = 0

for (const p of products ?? []) {
  const flags = byStyleName[p.style_name]
  if (!flags || (!flags.adds_exclude && !flags.exclusive)) { skipped++; continue }

  const { error } = await sb.from('products').update({
    adds_exclude: flags.adds_exclude,
    exclusive:    flags.exclusive,
  }).eq('id', p.id)

  if (error) console.error('\nError:', p.style_name, error.message)
  else updated++

  if ((updated + skipped) % 100 === 0)
    process.stdout.write(`\r  ${updated + skipped}/${products?.length} (${updated} updated)`)
}

console.log(`\n\n✅ Done! ${updated} updated, ${skipped} skipped\n`)

// Stats
const withExclude   = (products ?? []).filter(p => byStyleName[p.style_name]?.adds_exclude).length
const withExclusive = (products ?? []).filter(p => byStyleName[p.style_name]?.exclusive).length
const codes = [...new Set(Object.values(byStyleName).map(f => f.exclusive).filter(Boolean))].sort()
console.log(`Products with adds_exclude : ${withExclude}`)
console.log(`Products with exclusive    : ${withExclusive}`)
console.log(`Exclusive codes            : ${codes.join(', ')}`)
