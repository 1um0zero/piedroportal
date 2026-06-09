/**
 * Backfill orders.tracking_link from Dataverse cr56f_trackinglink (matched by
 * dataverse_id). Run AFTER supabase-add-tracking.sql.
 *
 * Usage: node scripts/backfill-order-tracking.mjs [--apply]
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
const API = env.DATAVERSE_URL + '/api/data/v9.2'
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function token() {
  const r = await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET, scope: env.DATAVERSE_URL + '/.default' }),
  })
  return (await r.json()).access_token
}
async function fetchAll(path, t) {
  const headers = { Authorization: 'Bearer ' + t, Accept: 'application/json', Prefer: 'odata.maxpagesize=2000' }
  let url = API + path, out = []
  while (url) { const r = await fetch(url, { headers }); if (!r.ok) throw new Error(r.status + ' ' + await r.text()); const j = await r.json(); out.push(...(j.value ?? [])); url = j['@odata.nextLink'] ?? null }
  return out
}

const main = async () => {
  console.log(APPLY ? '🚀 APPLY\n' : '🔍 DRY RUN\n')
  const t = await token()
  const rows = await fetchAll('/cr56f_wpp_orderses?$select=cr56f_wpp_ordersid,cr56f_trackinglink&$filter=cr56f_trackinglink ne null', t)
  console.log('Dataverse orders with a tracking link:', rows.length)
  if (!APPLY) {
    rows.slice(0, 5).forEach(r => console.log('   ', r.cr56f_wpp_ordersid.slice(0, 8), r.cr56f_trackinglink))
    console.log('\n[dry-run] re-run with --apply to write.')
    return
  }
  let updated = 0, missing = 0
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const res = await Promise.all(batch.map(async r => {
      const { data, error } = await supabase.from('orders')
        .update({ tracking_link: r.cr56f_trackinglink })
        .eq('dataverse_id', r.cr56f_wpp_ordersid).select('id')
      if (error) { console.error('❌', error.message); process.exit(1) }
      return data?.length ?? 0
    }))
    for (const n of res) { if (n > 0) updated += n; else missing++ }
    process.stdout.write(`\r  ${Math.min(i + 50, rows.length)}/${rows.length}`)
  }
  console.log(`\n✅ updated ${updated} orders; ${missing} Dataverse rows had no matching order in the DB.`)
}
main().catch(e => { console.error('❌', e.message); process.exit(1) })
