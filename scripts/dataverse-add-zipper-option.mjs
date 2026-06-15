// One-off: add the 4th option to the GLOBAL option set cr56f_wpp_zipper.
//   979580003 = "4 Lateral Zipper Next to closure + medial lace"
// Keeps the existing 1/2/3 numeric-prefix convention so the ERP cross-ref holds.
//
//   node scripts/dataverse-add-zipper-option.mjs
//
// Idempotent: skips if the value already exists. Publishes after insert.

import { readFileSync } from 'fs'
import { resolve } from 'path'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const OPTIONSET = 'cr56f_wpp_zipper'
const VALUE = 979580003
const LABEL = '4 Lateral Zipper Next to closure + medial lace'
const LCID = 1033 // English

const { access_token } = await (await fetch(
  `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
  { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${env.DATAVERSE_URL}/.default` }) }
)).json()

const H = { Authorization: `Bearer ${access_token}`, Accept: 'application/json',
  'OData-Version': '4.0', 'Content-Type': 'application/json' }
const API = `${env.DATAVERSE_URL}/api/data/v9.2`

// Check current options
const cur = await fetch(
  `${API}/GlobalOptionSetDefinitions(Name='${OPTIONSET}')?$select=Name`,
  { headers: H }
).then(r => r.json())
const existing = await fetch(
  `${API}/GlobalOptionSetDefinitions(Name='${OPTIONSET}')/Microsoft.Dynamics.CRM.OptionSetMetadata?$select=Options`,
  { headers: H }
).then(r => r.json()).catch(() => null)

const has = existing?.Options?.some(o => o.Value === VALUE)
if (has) { console.log(`Value ${VALUE} already present — nothing to do.`); process.exit(0) }

// InsertOptionValue (unbound action) against the global set
const res = await fetch(`${API}/InsertOptionValue`, {
  method: 'POST', headers: H,
  body: JSON.stringify({
    OptionSetName: OPTIONSET,
    Value: VALUE,
    Label: { LocalizedLabels: [{ Label: LABEL, LanguageCode: LCID, '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel' }],
             '@odata.type': 'Microsoft.Dynamics.CRM.Label' },
  }),
})
if (!res.ok) { console.error('InsertOptionValue failed:', res.status, await res.text()); process.exit(1) }

// Publish so the new value goes live
await fetch(`${API}/PublishAllXml`, { method: 'POST', headers: H })

console.log(`Inserted ${VALUE} = "${LABEL}" into ${OPTIONSET} and published.`)
