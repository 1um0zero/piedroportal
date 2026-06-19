/**
 * Inspect Dataverse cr56f_name (the legacy order number) to understand its
 * format and whether the sequence is global & monotonic regardless of date.
 * Read-only. Usage: node scripts/inspect-order-names.mjs
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const DV_URL = env.DATAVERSE_URL
const API = `${DV_URL}/api/data/v9.2`

const { access_token } = await (await fetch(
  `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
  { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${DV_URL}/.default` }) }
)).json()

const H = { Authorization: `Bearer ${access_token}`, Accept: 'application/json',
  'OData-Version': '4.0', 'OData-MaxVersion': '4.0',
  Prefer: 'odata.include-annotations="*",odata.maxpagesize=500' }

let url = `${API}/cr56f_wpp_orderses?$select=cr56f_wpp_ordersid,cr56f_name,createdon,cr56f_step&$orderby=createdon asc`
const all = []
while (url) {
  const j = await (await fetch(url, { headers: H })).json()
  all.push(...(j.value ?? []))
  url = j['@odata.nextLink'] ?? null
  process.stdout.write(`\r  fetched ${all.length}`)
}
console.log(`\nTotal orders: ${all.length}`)

const withName = all.filter(o => o.cr56f_name != null && String(o.cr56f_name).trim() !== '')
console.log(`With cr56f_name: ${withName.length}  | empty: ${all.length - withName.length}`)

console.log('\n── First 15 by createdon ──')
for (const o of all.slice(0, 15)) console.log(`  ${o.createdon}  step=${o.cr56f_step}  name="${o.cr56f_name}"`)
console.log('\n── Last 15 by createdon ──')
for (const o of all.slice(-15)) console.log(`  ${o.createdon}  step=${o.cr56f_step}  name="${o.cr56f_name}"`)

// Try to detect a numeric sequence: extract trailing digits and any date part
console.log('\n── Sample distinct name shapes ──')
const shapes = new Map()
for (const o of withName) {
  const shape = String(o.cr56f_name).replace(/\d/g, '#')
  if (!shapes.has(shape)) shapes.set(shape, o.cr56f_name)
}
for (const [shape, ex] of shapes) console.log(`  ${shape}   e.g. "${ex}"`)

// Is the trailing number monotonic with createdon?
const seqd = withName.map(o => {
  const m = String(o.cr56f_name).match(/(\d+)\s*$/)
  return { name: o.cr56f_name, seq: m ? parseInt(m[1]) : null, createdon: o.createdon }
}).filter(x => x.seq != null)
const seqs = seqd.map(x => x.seq)
console.log(`\nTrailing-number range: min=${Math.min(...seqs)} max=${Math.max(...seqs)} count=${seqs.length} distinct=${new Set(seqs).size}`)
let mono = 0
for (let i = 1; i < seqd.length; i++) if (seqd[i].seq >= seqd[i-1].seq) mono++
console.log(`Monotonic (seq grows with createdon asc): ${mono}/${seqd.length - 1}`)
