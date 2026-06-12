/** Probe: does _cr56f_user_value (or customercontact) hold data on Dataverse orders? */
import { readFileSync } from 'fs'
import { resolve } from 'path'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const DV_URL = env.DATAVERSE_URL
const API = `${DV_URL}/api/data/v9.2`

const res = await fetch(
  `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
  { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${DV_URL}/.default` }) })
const { access_token } = await res.json()
const headers = { Authorization: `Bearer ${access_token}`, Accept: 'application/json',
  Prefer: 'odata.include-annotations="*"' }

async function countNonNull(field) {
  const url = `${API}/cr56f_wpp_orderses?$select=cr56f_wpp_ordersid&$filter=${field} ne null&$count=true&$top=1`
  const r = await fetch(url, { headers })
  const j = await r.json()
  if (j.error) return `ERROR: ${j.error.message.slice(0, 120)}`
  return j['@odata.count']
}

for (const f of ['_cr56f_user_value', '_cr56f_customercontact_value', '_createdby_value']) {
  console.log(`${f}: ${await countNonNull(f)} non-null`)
}

// Sample of 5 orders with the user field populated (if any)
const r = await fetch(
  `${API}/cr56f_wpp_orderses?$select=cr56f_wpp_ordersid,_cr56f_user_value,createdon&$filter=_cr56f_user_value ne null&$top=5`,
  { headers })
const j = await r.json()
console.log('\nSample with _cr56f_user_value:')
for (const o of (j.value ?? [])) {
  console.log(`  ${o.createdon?.slice(0,10)}  user=${o._cr56f_user_value}  (${o['_cr56f_user_value@OData.Community.Display.V1.FormattedValue'] ?? '?'})`)
}
