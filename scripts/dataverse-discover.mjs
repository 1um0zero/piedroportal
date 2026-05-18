/**
 * Dataverse discovery script — lists custom entities and their fields.
 * Usage: node scripts/dataverse-discover.mjs
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually (no dotenv dependency needed)
const envPath = resolve(process.cwd(), '.env.local')
const envVars = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
    .map(([k, ...v]) => [k, v.join('=')])
)

const DATAVERSE_URL     = envVars.DATAVERSE_URL
const CLIENT_ID         = envVars.DATAVERSE_CLIENT_ID
const CLIENT_SECRET     = envVars.DATAVERSE_CLIENT_SECRET
const TENANT_ID         = envVars.DATAVERSE_TENANT_ID
const TOKEN_ENDPOINT    = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`
const API_BASE          = `${DATAVERSE_URL}/api/data/v9.2`

// ── Auth ────────────────────────────────────────────────────────────────────

async function getToken() {
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         `${DATAVERSE_URL}/.default`,
  })

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token request failed ${res.status}: ${err}`)
  }

  const { access_token } = await res.json()
  return access_token
}

// ── API helper ───────────────────────────────────────────────────────────────

async function dataverse(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: 'odata.include-annotations="*"',
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status} ${path}: ${err}`)
  }

  return res.json()
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔑  Getting token...')
  const token = await getToken()
  console.log('✓  Authenticated\n')

  // List all custom entity definitions (publisher prefix usually "cr" or custom)
  console.log('📋  Custom entities:')
  const meta = await dataverse(
    `/EntityDefinitions?$select=LogicalName,DisplayName,EntitySetName,IsCustomEntity`,
    token
  )

  // Show only custom entities
  const custom = meta.value.filter(e => e.IsCustomEntity)
  for (const e of custom) {
    const display = e.DisplayName?.UserLocalizedLabel?.Label ?? ''
    console.log(`  ${e.LogicalName.padEnd(50)} [${e.EntitySetName}]  ${display}`)
  }

  // Candidate entities: custom ones with product-related names
  const candidates = custom
    .filter(e =>
      /product|article|shoe|item|model|catalog|catal|piedro|schoeisel/i.test(e.LogicalName) ||
      /product|article|shoe|item|model|catalog|catal|piedro/i.test(e.DisplayName?.UserLocalizedLabel?.Label ?? '')
    )

  if (candidates.length > 0) {
    console.log(`\n🔍  Likely product entities (${candidates.length}):`)
    for (const e of candidates) {
      console.log(`\n  → ${e.LogicalName} (${e.EntitySetName})`)
      try {
        const sample = await dataverse(`/${e.EntitySetName}?$top=2`, token)
        if (sample.value?.length) {
          console.log('    Fields:', Object.keys(sample.value[0]).slice(0, 20).join(', '))
          console.log('    Sample:', JSON.stringify(sample.value[0]).slice(0, 200))
        } else {
          console.log('    (no records)')
        }
      } catch (err) {
        console.log('    Error:', err.message)
      }
    }
  } else {
    console.log('\n⚠  No obvious product entities found. Check the full list above.')
  }
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
