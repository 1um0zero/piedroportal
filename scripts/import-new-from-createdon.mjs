/**
 * Restore the "NEW" badge from Dataverse style creation dates.
 *
 * The old Power Pages portal showed NEW for recently-introduced families; that
 * flag lived only in Power Pages and was never migrated (only a hardcoded prefix
 * list in mark-new-products.mjs ever set new_until here). Dataverse styles DO
 * carry a real `createdon`, so we mark as NEW every active product whose style
 * was created on/after CUTOFF, with an expiry of createdon + NEW_MONTHS so the
 * badge ages out naturally. new_until stays admin-editable in ProductForm.
 *
 * Dry-run:  node scripts/import-new-from-createdon.mjs
 * Apply:    node scripts/import-new-from-createdon.mjs --apply
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const CUTOFF = '2025-10-01'   // styles created on/after this are "new"
const NEW_MONTHS = 11         // badge lifetime from creation

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

const c = await (await fetch(`${env.DATAVERSE_URL}/api/data/v9.2/cr56f_wpp_styleses?$select=createdon,cr56f_name&$top=5000`, { headers: H })).json()
const createdByStyle = {}
for (const x of c.value || []) if (x.cr56f_name) createdByStyle[String(x.cr56f_name)] = x.createdon

const addMonths = (iso, m) => { const d = new Date(iso); d.setMonth(d.getMonth() + m); return d.toISOString() }

const { data: prods } = await sb.from('products').select('id, style_name, section, active').eq('active', true)
const updates = []
const split = { KIDS: 0, MEN: 0, WOMEN: 0 }
for (const p of prods) {
  const cd = createdByStyle[String(p.style_name)]
  if (cd && cd >= CUTOFF) {
    updates.push({ id: p.id, new_until: addMonths(cd, NEW_MONTHS) })
    split[p.section] = (split[p.section] || 0) + 1
  }
}

console.log(`Cutoff ${CUTOFF} · badge lifetime ${NEW_MONTHS} months`)
console.log(`Products to mark NEW: ${updates.length} ->`, JSON.stringify(split))
console.log('Sample:', updates.slice(0, 3))

if (!APPLY) { console.log('\nDRY-RUN — re-run with --apply to write.'); process.exit(0) }

let done = 0
for (let i = 0; i < updates.length; i += 50) {
  await Promise.all(updates.slice(i, i + 50).map(async u => {
    const { error } = await sb.from('products').update({ new_until: u.new_until }).eq('id', u.id)
    if (!error) done++
  }))
}
console.log(`\n✅ Updated ${done}/${updates.length} products with new_until.`)
