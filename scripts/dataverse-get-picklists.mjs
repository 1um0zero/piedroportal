import { readFileSync } from 'fs'
import { resolve } from 'path'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const { access_token } = await (await fetch(
  `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
  { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${env.DATAVERSE_URL}/.default` }) }
)).json()

const H = { Authorization: `Bearer ${access_token}`, Accept: 'application/json', 'OData-Version': '4.0' }
const API = `${env.DATAVERSE_URL}/api/data/v9.2`

const fields = [
  'cr56f_lateraljointwidthlf', 'cr56f_medialjointwidthlf', 'cr56f_lateralheelwidthlf',
  'cr56f_medialheelwidthlf', 'cr56f_2hammertoelf', 'cr56f_2toeboxlf', 'cr56f_2bunionettelf',
  'cr56f_2halluxvalguslf', 'cr56f_2depthtoforepartlf', 'cr56f_2depthtotoeheellf',
  'cr56f_2extrawidthonconelf', 'cr56f_2straightenheelcliplf', 'cr56f_2heeldepthonlylf',
  'cr56f_2haglundheelexostosislf', 'cr56f_2rockersoletypeslf',
  'cr56f_lininglf', 'cr56f_stiffenerhardnesslf', 'cr56f_toepuffslf',
  'cr56f_extrapaddingontonguelf', 'cr56f_zipperlf', 'cr56f_closurelaceslf',
  'cr56f_3sf_mediallf', 'cr56f_3hf_mediallf', 'cr56f_4sw_mediallf', 'cr56f_4hw_mediallf',
  'cr56f_3ankle_height_conditionallf', 'cr56f_3haglund_height_conditionallf',
  'cr56f_3haglund_position_conditionallf',
]

for (const field of fields) {
  const meta = await fetch(
    `${API}/EntityDefinitions(LogicalName='cr56f_wpp_orders')/Attributes(LogicalName='${field}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)`,
    { headers: H }
  ).then(r => r.json()).catch(() => null)

  if (meta?.OptionSet?.Options?.length) {
    const opts = meta.OptionSet.Options.map(o => `${o.Value}: ${o.Label?.UserLocalizedLabel?.Label}`)
    console.log(`\n${field}:`)
    opts.forEach(o => console.log('  ', o))
  } else {
    // Not a picklist — check type
    const attr = await fetch(
      `${API}/EntityDefinitions(LogicalName='cr56f_wpp_orders')/Attributes(LogicalName='${field}')?$select=AttributeType,MinValue,MaxValue`,
      { headers: H }
    ).then(r => r.json()).catch(() => null)
    if (attr) console.log(`${field}: ${attr.AttributeType}`)
  }
}
