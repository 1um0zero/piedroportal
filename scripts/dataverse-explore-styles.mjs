/**
 * Explore Piedro Dataverse entities: fields + sample records
 * Usage: node scripts/dataverse-explore-styles.mjs
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const envVars = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)
const URL_BASE = envVars.DATAVERSE_URL
const TOKEN_EP = `https://login.microsoftonline.com/${envVars.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`
const API      = `${URL_BASE}/api/data/v9.2`

async function getToken() {
  const res = await fetch(TOKEN_EP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id:  envVars.DATAVERSE_CLIENT_ID,
      client_secret: envVars.DATAVERSE_CLIENT_SECRET,
      scope: `${URL_BASE}/.default`,
    }),
  })
  const { access_token } = await res.json()
  return access_token
}

async function get(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0', 'OData-Version': '4.0',
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`)
  return res.json()
}

async function showEntity(name, setName, token) {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`Entity: ${name}  →  /${setName}`)
  console.log('═'.repeat(70))
  try {
    const data = await get(`/${setName}?$top=2`, token)
    if (!data.value?.length) { console.log('  (no records)'); return }
    console.log(`Fields (${Object.keys(data.value[0]).length}):`)
    for (const [k, v] of Object.entries(data.value[0])) {
      if (k.startsWith('@')) continue
      const display = typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v ?? '').slice(0, 60)
      console.log(`  ${k.padEnd(45)} ${display}`)
    }
  } catch (e) { console.log('  Error:', e.message) }
}

async function main() {
  const token = await getToken()
  console.log('✓ Authenticated\n')

  const entities = [
    ['cr56f_wpp_styles',           'cr56f_wpp_styleses'],
    ['cr56f_wpp_style_colors',     'cr56f_wpp_style_colorses'],
    ['cr56f_wpp_gender',           'cr56f_wpp_genders'],
    ['cr56f_wpp_closures',         'cr56f_wpp_closureses'],
    ['cr56f_construction',         'cr56f_constructions'],
    ['cr56f_constructionwidths',   'cr56f_constructionwidthses'],
    ['cr56f_constructionsstyle',   'cr56f_constructionsstyles'],
    ['cr56f_wpp_sizes',            'cr56f_wpp_sizeses'],
    ['cr56f_wpp_size_scales',      'cr56f_wpp_size_scaleses'],
    ['cr56f_wpp_widths',           'cr56f_wpp_widthses'],
    ['cr56f_wpp_translations',     'cr56f_wpp_translationses'],
  ]

  for (const [name, set] of entities) {
    await showEntity(name, set, token)
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
