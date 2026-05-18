import { readFileSync } from 'fs'
import { resolve } from 'path'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const API = `${env.DATAVERSE_URL}/api/data/v9.2`

async function getToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials',
        client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET,
        scope: `${env.DATAVERSE_URL}/.default` }) }
  )
  const { access_token } = await res.json()
  return access_token
}

async function get(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json',
      'OData-MaxVersion': '4.0', 'OData-Version': '4.0',
      Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"' }
  })
  return res.json()
}

const token = await getToken()

// Get distinct gender values with their formatted labels
const data = await get(
  '/cr56f_wpp_styleses?$select=cr56f_gender,cr56f_name&$top=200',
  token
)

const seen = new Map()
for (const r of data.value) {
  const raw = r.cr56f_gender
  const label = r['cr56f_gender@OData.Community.Display.V1.FormattedValue'] ?? '(no annotation)'
  if (!seen.has(raw)) seen.set(raw, { label, count: 0, examples: [] })
  const entry = seen.get(raw)
  entry.count++
  if (entry.examples.length < 3) entry.examples.push(r.cr56f_name)
}

console.log('Gender OptionSet values in cr56f_wpp_styles:\n')
for (const [raw, { label, count, examples }] of seen) {
  console.log(`  raw=${raw}  label="${label}"  count=${count}  examples: ${examples.join(', ')}`)
}
