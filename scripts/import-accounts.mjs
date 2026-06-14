/**
 * Import active Accounts from Dataverse → Supabase companies table
 * Usage: node scripts/import-accounts.mjs
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── Country normalisation ─────────────────────────────────────────────────────
// Dataverse `address1_country` is free text in several languages (NL, NEDERLANDS,
// HOLANDA, "HOLANDA NLS 02", NETHERLANDS, ALEMANHA, DUITSLAND…). Fold to ASCII
// upper-case, then match against a token table → { ISO-3166 alpha-2, English name }.
// Rules are ordered; first matching substring wins. Returns null when unmapped.
const COUNTRY_RULES = [
  [/NEDERLAND|NETHERLAND|HOLAND|HOLLAND|^NLS?\b|\bNL\b/, 'NL', 'Netherlands'],
  [/BELG|BELGIE|BELGIQUE/, 'BE', 'Belgium'],
  [/DUITSL|ALEMANH|GERMAN|DEUTSCHL|\bDE\b/, 'DE', 'Germany'],
  [/PORTUG|\bPT\b/, 'PT', 'Portugal'],
  [/FRANC|FRANKR|\bFR\b/, 'FR', 'France'],
  [/\bSPAIN|ESPAN|SPANJE|\bES\b/, 'ES', 'Spain'],
  [/ITAL|\bIT\b/, 'IT', 'Italy'],
  [/FINLAN|FINLAND|SUOMI/, 'FI', 'Finland'],
  [/POLEN|POLAND|POLONIA|POLSKA/, 'PL', 'Poland'],
  [/SUICA|SUISSE|SWITZERL|ZWITSERL|SCHWEIZ/, 'CH', 'Switzerland'],
  [/SUECIA|SWEDEN|SVERIGE|ZWEDEN/, 'SE', 'Sweden'],
  [/NOORWEG|NORWAY|NORGE/, 'NO', 'Norway'],
  [/DENMARK|DENEMARK|DANMARK/, 'DK', 'Denmark'],
  [/UNITED KINGD|ENGELAND|ENGLAND|BRITAIN|\bUK\b|\bGB\b/, 'GB', 'United Kingdom'],
  [/IRELAND|IERLAND/, 'IE', 'Ireland'],
  [/AUSTRIA|OOSTENR/, 'AT', 'Austria'],
  [/AUSTRALI/, 'AU', 'Australia'],
  [/\bUSA\b|UNITED STAT|AMERICA/, 'US', 'United States'],
  [/CANADA/, 'CA', 'Canada'],
  [/BRAZIL|BRASIL|BRAZILIE/, 'BR', 'Brazil'],
  [/JAPAN/, 'JP', 'Japan'],
  [/SINGAPOR/, 'SG', 'Singapore'],
  [/SOUTH.?KOREA|ZUID.?KOREA|KOREA/, 'KR', 'South Korea'],
  [/CYPRUS|CYPER/, 'CY', 'Cyprus'],
  [/ISRAEL/, 'IL', 'Israel'],
  [/TURKIJE|TURKEY|TURKIYE/, 'TR', 'Turkey'],
  [/CURACAO/, 'CW', 'Curaçao'],
  [/ARUBA/, 'AW', 'Aruba'],
]
function normaliseCountry(raw) {
  if (!raw) return { code: null, name: null }
  const folded = raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toUpperCase().trim()
  for (const [re, code, name] of COUNTRY_RULES) {
    if (re.test(folded)) return { code, name }
  }
  return { code: null, name: null }
}

// ── Dataverse auth ────────────────────────────────────────────────────────────
async function getToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.DATAVERSE_CLIENT_ID,
        client_secret: env.DATAVERSE_CLIENT_SECRET,
        scope: `${env.DATAVERSE_URL}/.default`,
      }) }
  )
  const { access_token } = await res.json()
  return access_token
}

// ── Fetch all active accounts (paginated) ─────────────────────────────────────
async function fetchAccounts(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'OData-Version': '4.0',
    Prefer: 'odata.maxpagesize=500',
  }
  let url = `${env.DATAVERSE_URL}/api/data/v9.2/accounts` +
    `?$select=accountid,name,accountnumber,emailaddress1,telephone1,` +
    `address1_country,address1_city,address1_line1` +
    `&$filter=statecode eq 0` +
    `&$orderby=name`

  const all = []
  while (url) {
    const res = await fetch(url, { headers })
    const json = await res.json()
    all.push(...(json.value ?? []))
    url = json['@odata.nextLink'] ?? null
    process.stdout.write(`\r  Fetched ${all.length}...`)
  }
  return all
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('Importing Dataverse Accounts → Supabase companies\n')

const token = await getToken()
console.log('✓ Authenticated\n')

console.log('Fetching accounts...')
const accounts = await fetchAccounts(token)
console.log(`\n✓ ${accounts.length} active accounts fetched\n`)

// Filter out placeholder accounts (name is blank or just " - 000XXX")
const valid = accounts.filter(a => {
  const n = (a.name ?? '').trim()
  return n && !/^\s*-\s*\d+\s*$/.test(n)
})
console.log(`  (${accounts.length - valid.length} placeholder accounts skipped)\n`)

// Map to Supabase companies schema
let unmappedCountries = 0
const companies = valid.map(a => {
  // Remove trailing " - XXXXXX" account number suffix from name
  const name = (a.name ?? '').trim().replace(/\s*-\s*\d{6}$/, '').trim()
  const rawCountry = (a.address1_country ?? '').trim() || null
  const { code, name: countryName } = normaliseCountry(rawCountry)
  if (rawCountry && !code) unmappedCountries++
  return {
    id:            a.accountid,
    name:          name || a.accountnumber,
    erp_code:      (a.accountnumber ?? '').trim(),
    email:         a.emailaddress1 ?? null,
    phone:         a.telephone1 ?? null,
    country_code:  code,
    country:       countryName,
    country_raw:   rawCountry,
    city:          (a.address1_city ?? '').trim() || null,
    address_line1: (a.address1_line1 ?? '').trim() || null,
  }
})

const nlCount = companies.filter(c => c.country_code === 'NL').length
console.log(`\nCountry: ${nlCount} NL · ${unmappedCountries} unmapped (kept in country_raw)`)

// Preview
console.log('Preview (first 5):')
companies.slice(0, 5).forEach(c =>
  console.log(`  [${c.erp_code}] ${c.name}`)
)

// Upsert into Supabase (update if exists, insert if new)
console.log(`\nUpserting ${companies.length} companies...`)
const BATCH = 100
let done = 0

for (let i = 0; i < companies.length; i += BATCH) {
  const batch = companies.slice(i, i + BATCH)
  const { error } = await sb.from('companies').upsert(batch, { onConflict: 'id' })
  if (error) {
    // If any optional column doesn't exist yet (e.g. migration 027 not run),
    // retry with just the core columns so the import still succeeds.
    if (/column|schema cache|does not exist/i.test(error.message)) {
      console.warn(`\n⚠  Optional column missing (${error.message}); retrying core columns only. Run migration 027 to persist country/address.`)
      const slim = batch.map(({ id, name, erp_code }) => ({ id, name, erp_code }))
      const { error: e2 } = await sb.from('companies').upsert(slim, { onConflict: 'id' })
      if (e2) { console.error('\n❌ Error:', e2.message); process.exit(1) }
    } else {
      console.error('\n❌ Error:', error.message)
      process.exit(1)
    }
  }
  done += batch.length
  process.stdout.write(`\r  ${done}/${companies.length} upserted`)
}

console.log('\n\n✅ Import complete!')
console.log(`   ${companies.length} companies now in Supabase`)
