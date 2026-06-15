// Dumps EVERY option-set (picklist) on the cr56f_wpp_orders entity to
// docs/dataverse-option-sets.json + .csv — value codes + labels per field.
// Jorge suspects the ERP cross-references these numeric codes, so we capture
// the full code↔label tables (not just the readable labels the import keeps).
//
//   node scripts/dataverse-dump-optionsets.mjs
//
// Requires DATAVERSE_* in .env.local.

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const ENTITY = process.env.ENTITY || 'cr56f_wpp_orders'

const { access_token } = await (await fetch(
  `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
  { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${env.DATAVERSE_URL}/.default` }) }
)).json()

const H = { Authorization: `Bearer ${access_token}`, Accept: 'application/json', 'OData-Version': '4.0' }
const API = `${env.DATAVERSE_URL}/api/data/v9.2`

// Pull every Picklist attribute of the entity in one shot, with options expanded.
const url = `${API}/EntityDefinitions(LogicalName='${ENTITY}')/Attributes/`
  + `Microsoft.Dynamics.CRM.PicklistAttributeMetadata`
  + `?$select=LogicalName,DisplayName`
  + `&$expand=OptionSet($select=Name,IsGlobal,Options),GlobalOptionSet($select=Name,Options)`

const res = await fetch(url, { headers: H }).then(r => r.json())
if (!res.value) { console.error('Unexpected response:', JSON.stringify(res, null, 2)); process.exit(1) }

const rows = []      // flat rows for CSV: field;optionset;is_global;value;label
const byField = {}   // structured for JSON

for (const a of res.value.sort((x, y) => x.LogicalName.localeCompare(y.LogicalName))) {
  const set = a.GlobalOptionSet || a.OptionSet
  const opts = (set?.Options ?? []).map(o => ({
    value: o.Value,
    label: o.Label?.UserLocalizedLabel?.Label ?? null,
  }))
  byField[a.LogicalName] = {
    display: a.DisplayName?.UserLocalizedLabel?.Label ?? null,
    optionSet: set?.Name ?? null,
    isGlobal: !!a.GlobalOptionSet || !!a.OptionSet?.IsGlobal,
    options: opts,
  }
  for (const o of opts) {
    rows.push([a.LogicalName, set?.Name ?? '', byField[a.LogicalName].isGlobal, o.value, (o.label ?? '').replace(/;/g, ',')])
  }
}

mkdirSync(resolve(process.cwd(), 'docs'), { recursive: true })
writeFileSync(resolve(process.cwd(), 'docs/dataverse-option-sets.json'),
  JSON.stringify({ entity: ENTITY, fetchedAt: new Date().toISOString(), fields: byField }, null, 2))

const csv = ['field;option_set;is_global;value;label', ...rows.map(r => r.join(';'))].join('\n')
writeFileSync(resolve(process.cwd(), 'docs/dataverse-option-sets.csv'), csv)

console.log(`${Object.keys(byField).length} picklist fields, ${rows.length} option values`)
console.log('→ docs/dataverse-option-sets.json')
console.log('→ docs/dataverse-option-sets.csv')
