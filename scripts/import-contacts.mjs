/**
 * Migrate Power Pages / Dataverse CONTACTS → Supabase Auth users + profiles + user_companies.
 *
 * Clean transition: NO invite email is sent. Each user is created with email_confirm=true and a
 * random password, and flagged `profiles.must_set_password = true` so the portal forces them to set
 * their own password on first login (via the /set-password flow + middleware guard).
 *
 * company_admin detection (default): a contact is company_admin of its account if it is that
 * account's PRIMARY CONTACT (account._primarycontactid_value). Override per ⚠️ Q4.1 if Piedro uses
 * a different rule (web role, a custom field, or an explicit list).
 *
 * Idempotent: re-running finds existing auth users by email and upserts profiles + user_companies.
 *
 * Prereqs (run first): import-accounts.mjs (companies must exist) and migration 006.
 *
 * Usage:
 *   node scripts/import-contacts.mjs --dry-run            # no writes; prints a full report
 *   node scripts/import-contacts.mjs --dry-run --discover # also prints available contact field names
 *   node scripts/import-contacts.mjs                      # perform the migration
 *   node scripts/import-contacts.mjs --limit=50           # cap (testing)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'

// ── Env ─────────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb     = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DV_URL = env.DATAVERSE_URL
const API    = `${DV_URL}/api/data/v9.2`

const DRY_RUN  = process.argv.includes('--dry-run')
const DISCOVER = process.argv.includes('--discover')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT    = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity

const mask = (e) => (e ? e.replace(/^(.).*(@.*)$/, '$1***$2') : '(none)')

// ── Dataverse auth ──────────────────────────────────────────────────────────
async function getToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
        client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${DV_URL}/.default` }) }
  )
  const { access_token } = await res.json()
  if (!access_token) throw new Error('Dataverse auth failed — check DATAVERSE_* creds')
  return access_token
}

async function dvFetchAll(path, token) {
  const headers = {
    Authorization: `Bearer ${token}`, Accept: 'application/json',
    'OData-Version': '4.0', 'OData-MaxVersion': '4.0',
    Prefer: 'odata.include-annotations="*",odata.maxpagesize=500',
  }
  let url = `${API}${path}`
  const all = []
  while (url) {
    const res = await fetch(url, { headers })
    const json = await res.json()
    if (json.error) throw new Error(`Dataverse: ${json.error.message}`)
    all.push(...(json.value ?? []))
    url = json['@odata.nextLink'] ?? null
  }
  return all
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log(`\nMigrating Dataverse contacts → Supabase users  ${DRY_RUN ? '(DRY RUN)' : ''}\n`)
const token = await getToken()
console.log('✓ Dataverse authenticated')

// 0. Optional schema discovery (field NAMES only — no PII printed)
if (DISCOVER) {
  const sample = await dvFetchAll('/contacts?$top=1', token)
  if (sample[0]) {
    console.log('\nAvailable contact fields:\n  ' +
      Object.keys(sample[0]).filter(k => !k.startsWith('@')).join('\n  '))
  }
  console.log('\n(discover only) — adjust the $select below if Piedro uses custom fields, then re-run.\n')
  process.exit(0)
}

// 1. Companies that exist in Supabase (must run import-accounts.mjs first)
const { data: companyRows, error: cErr } = await sb.from('companies').select('id, default_locale')
if (cErr) { console.error('❌ Supabase companies read failed:', cErr.message); process.exit(1) }
const companyById = new Map(companyRows.map(c => [c.id, c]))
console.log(`✓ ${companyById.size} companies in Supabase`)

// 2. company_admin is NOT inferred here (Q4.1): every migrated user is imported as a
// regular member; a piedro_admin designates company admins later on the company sheet.

// 3. Active contacts with an email and an account
const contacts = await dvFetchAll(
  '/contacts?$select=contactid,fullname,firstname,lastname,emailaddress1,' +
  '_parentcustomerid_value&$filter=statecode eq 0 and emailaddress1 ne null', token)
console.log(`✓ ${contacts.length} active contacts with email`)

// 4. Map + filter
const seenEmail = new Set()
const skipped = { noCompany: 0, companyNotImported: 0, dupEmail: 0 }
const planned = []
for (const c of contacts) {
  const email = (c.emailaddress1 ?? '').trim().toLowerCase()
  if (!email) continue
  const companyId = c._parentcustomerid_value
  if (!companyId) { skipped.noCompany++; continue }
  if (!companyById.has(companyId)) { skipped.companyNotImported++; continue }
  if (seenEmail.has(email)) { skipped.dupEmail++; continue }
  seenEmail.add(email)
  const fullName = (c.fullname ?? `${c.firstname ?? ''} ${c.lastname ?? ''}`).trim() || email
  planned.push({
    contactId: c.contactid,
    email,
    fullName,
    companyId,
    isAdmin: false, // company_admin assigned later on the company sheet (Q4.1)
    locale: companyById.get(companyId).default_locale ?? 'en',
  })
}
const list = Number.isFinite(LIMIT) ? planned.slice(0, LIMIT) : planned

console.log('\n── Plan ──────────────────────────────────────')
console.log(`  Users to create/link : ${list.length}`)
console.log(`  Company admins       : assigned later on the company sheet (Q4.1)`)
console.log(`  Skipped — no account            : ${skipped.noCompany}`)
console.log(`  Skipped — company not imported  : ${skipped.companyNotImported}`)
console.log(`  Skipped — duplicate email       : ${skipped.dupEmail}`)
console.log('  Sample:', list.slice(0, 5).map(u => `${mask(u.email)}${u.isAdmin ? ' [admin]' : ''}`).join(', '))

if (DRY_RUN) { console.log('\n[dry-run] No writes performed.\n'); process.exit(0) }

// 5. Build email → existing auth user id map (idempotency)
console.log('\nLoading existing auth users...')
const existingByEmail = new Map()
for (let page = 1; ; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) { console.error('❌ listUsers:', error.message); process.exit(1) }
  data.users.forEach(u => u.email && existingByEmail.set(u.email.toLowerCase(), u.id))
  if (data.users.length < 1000) break
}
console.log(`  ${existingByEmail.size} existing auth users`)

// 6. Create/find users. CRITICAL: only NEW accounts get a fresh profile
// (role 'user' + must_set_password). NEVER clobber an existing user's profile —
// e.g. a piedro_admin who also exists as a Dataverse contact must keep their role
// and not be force-reset. Existing users only get the company link (without
// downgrading an existing is_company_admin flag).
let created = 0, reused = 0, failed = 0
const profiles = []          // NEW users only
const newLinks = []          // links for NEW users (safe to set is_company_admin)
const reusedLinks = []       // links for EXISTING users (insert-if-absent only)
for (const u of list) {
  let userId = existingByEmail.get(u.email)
  let isNew = false
  if (!userId) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      email_confirm: true,                       // confirmed, but no email sent
      password: randomUUID() + randomUUID(),     // unusable; user resets on first login
      user_metadata: { full_name: u.fullName },
    })
    if (error || !data?.user) {
      console.error(`\n  ❌ ${mask(u.email)}: ${error?.message ?? 'no user returned'}`); failed++; continue
    }
    userId = data.user.id; created++; isNew = true
  } else { reused++ }

  const link = { user_id: userId, company_id: u.companyId, is_company_admin: u.isAdmin }
  if (isNew) {
    profiles.push({
      id: userId, email: u.email, full_name: u.fullName,
      role: 'user', preferred_locale: u.locale, must_set_password: true,
    })
    newLinks.push(link)
  } else {
    reusedLinks.push(link)
  }
  process.stdout.write(`\r  processed ${created + reused}/${list.length}`)
}

console.log(`\n\nUpserting ${profiles.length} new profiles + ${newLinks.length + reusedLinks.length} user_companies...`)
for (let i = 0; i < profiles.length; i += 100) {
  const { error } = await sb.from('profiles').upsert(profiles.slice(i, i + 100), { onConflict: 'id' })
  if (error) { console.error('❌ profiles upsert:', error.message); process.exit(1) }
}
for (let i = 0; i < newLinks.length; i += 100) {
  const { error } = await sb.from('user_companies')
    .upsert(newLinks.slice(i, i + 100), { onConflict: 'user_id,company_id' })
  if (error) { console.error('❌ user_companies upsert:', error.message); process.exit(1) }
}
// Existing users: add the membership only if absent — never reset is_company_admin.
for (let i = 0; i < reusedLinks.length; i += 100) {
  const { error } = await sb.from('user_companies')
    .upsert(reusedLinks.slice(i, i + 100), { onConflict: 'user_id,company_id', ignoreDuplicates: true })
  if (error) { console.error('❌ user_companies upsert:', error.message); process.exit(1) }
}

console.log(`\n✅ Done. created=${created} reused=${reused} failed=${failed}`)
console.log('   All migrated users must set their password on first login.\n')
