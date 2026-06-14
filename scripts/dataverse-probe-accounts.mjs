/**
 * Probe the Dataverse `account` entity: which address/contact columns exist and
 * how well they are populated across ALL active accounts. Read-only — writes
 * nothing. Usage: node scripts/dataverse-probe-accounts.mjs
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const API = `${env.DATAVERSE_URL}/api/data/v9.2`

async function getToken() {
  const res = await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET,
      scope: `${env.DATAVERSE_URL}/.default`,
    }),
  })
  const { access_token } = await res.json()
  return access_token
}

async function dv(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'OData-Version': '4.0', Prefer: 'odata.maxpagesize=500' },
  })
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`)
  return res.json()
}

const token = await getToken()
console.log('✓ Authenticated\n')

// 1) Full attribute list for the account entity (logical name + type + label)
const meta = await dv(
  `/EntityDefinitions(LogicalName='account')/Attributes` +
  `?$select=LogicalName,AttributeType,DisplayName&$filter=IsValidForRead eq true`, token)
const attrs = meta.value
  .map(a => ({ name: a.LogicalName, type: a.AttributeType, label: a.DisplayName?.UserLocalizedLabel?.Label ?? '' }))
  .sort((a, b) => a.name.localeCompare(b.name))

console.log(`📋  account has ${attrs.length} readable attributes.\n`)
const interesting = attrs.filter(a => /country|land|address|city|postal|zip|region|state|email|phone|tele|web|vat|btw|currency|language|taal|gender|customertype|category|industry|territory/i.test(a.name))
console.log('🔎  Address / contact / classification attributes:')
for (const a of interesting) console.log(`  ${a.name.padEnd(34)} ${String(a.type).padEnd(14)} ${a.label}`)

// 2) Fill-rate over ALL active accounts for a focused set of columns.
const PROBE = [
  'address1_country', 'address1_city', 'address1_postalcode', 'address1_stateorprovince',
  'address1_line1', 'emailaddress1', 'telephone1', 'websiteurl',
  'address1_telephone1',
]
// Keep only the ones that actually exist as readable attributes.
const exist = new Set(attrs.map(a => a.name))
const cols = PROBE.filter(c => exist.has(c))

let url = `/accounts?$select=${cols.join(',')}&$filter=statecode eq 0`
const counts = Object.fromEntries(cols.map(c => [c, 0]))
const countryValues = new Map()
let total = 0
while (url) {
  const json = await dv(url, token)
  for (const row of json.value) {
    total++
    for (const c of cols) {
      const v = row[c]
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        counts[c]++
        if (c === 'address1_country') {
          const k = String(v).trim()
          countryValues.set(k, (countryValues.get(k) ?? 0) + 1)
        }
      }
    }
  }
  url = json['@odata.nextLink'] ? json['@odata.nextLink'].replace(`${API}`, '') : null
  process.stdout.write(`\r  scanned ${total} accounts...`)
}
console.log(`\n\n📊  Fill-rate across ${total} active accounts:`)
for (const c of cols) {
  const pct = total ? ((counts[c] / total) * 100).toFixed(1) : '0'
  console.log(`  ${c.padEnd(28)} ${String(counts[c]).padStart(5)} / ${total}  (${pct}%)`)
}

console.log('\n🌍  Distinct address1_country values (count):')
const sorted = [...countryValues.entries()].sort((a, b) => b[1] - a[1])
for (const [k, n] of sorted) console.log(`  ${String(n).padStart(5)}  ${k}`)
