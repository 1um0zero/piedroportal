/**
 * Backfill orders.user_id for MIGRATED orders (imported with user_id = null).
 *
 * The Dataverse order import did not capture which portal contact owned each
 * order, so we resolve it here:
 *     Supabase order (user_id null)  →  by dataverse_id
 *     Dataverse order                →  <contact lookup field>  →  contactId
 *     Dataverse contact              →  emailaddress1           →  email
 *     Supabase auth user             →  by email                →  user_id
 *
 * The contact-lookup field on the order entity is site-specific and unknown up
 * front. Run `--discover` first to list the order's lookup fields and their
 * target entity, pick the one that points to `contact`, then pass it via
 * `--contact-field=_<name>_value`.
 *
 * Prereq: run import-contacts.mjs first (so the auth users exist by email).
 *
 * Usage:
 *   node scripts/backfill-order-users.mjs --discover
 *   node scripts/backfill-order-users.mjs --contact-field=_cr56f_contact_value --dry-run
 *   node scripts/backfill-order-users.mjs --contact-field=_cr56f_contact_value
 *   node scripts/backfill-order-users.mjs --contact-field=... --fallback-admin   # optional
 *   node scripts/backfill-order-users.mjs --verify       # post-hoc cross-check (no Dataverse)
 *
 * Safety: an order is assigned ONLY if (1) the contact's parent account == the
 * order's company AND (2) the resolved user is a member of that company
 * (user_companies). Violations are reported and skipped, never written. company_id
 * is never modified. Run --verify afterwards to prove every assignment is valid.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

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
const VERIFY   = process.argv.includes('--verify')
const FALLBACK_ADMIN = process.argv.includes('--fallback-admin')
const fieldArg = process.argv.find(a => a.startsWith('--contact-field='))
const CONTACT_FIELD = fieldArg ? fieldArg.split('=')[1] : null
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT    = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity

async function getToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
        client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${DV_URL}/.default` }) }
  )
  const { access_token } = await res.json()
  if (!access_token) throw new Error('Dataverse auth failed')
  return access_token
}

async function dvFetchAll(path, token) {
  const headers = {
    Authorization: `Bearer ${token}`, Accept: 'application/json',
    'OData-Version': '4.0', 'OData-MaxVersion': '4.0',
    Prefer: 'odata.include-annotations="*",odata.maxpagesize=2000',
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

// ── Membership helper: every (user_id|company_id) pair in user_companies ───────
async function loadMembership() {
  const set = new Set()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('user_companies').select('user_id, company_id').range(from, from + 999)
    if (error) { console.error('❌ user_companies read:', error.message); process.exit(1) }
    data.forEach(r => set.add(`${r.user_id}|${r.company_id}`))
    if (data.length < 1000) break
  }
  return set
}

console.log(`\nBackfill orders.user_id  ${DRY_RUN ? '(DRY RUN)' : ''}${VERIFY ? '(VERIFY)' : ''}\n`)

// ── --verify: final cross-check (no Dataverse needed) ─────────────────────────
// Every assigned order's user MUST be a member of that order's company.
if (VERIFY) {
  const membership = await loadMembership()
  const bad = []
  let total = 0
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('orders').select('id, user_id, company_id')
      .not('user_id', 'is', null).not('company_id', 'is', null).range(from, from + 999)
    if (error) { console.error('❌ orders read:', error.message); process.exit(1) }
    total += data.length
    for (const o of data) if (!membership.has(`${o.user_id}|${o.company_id}`)) bad.push(o.id)
    if (data.length < 1000) break
  }
  console.log(`Checked ${total} assigned orders.`)
  console.log(bad.length === 0
    ? '✅ PASS — every order\'s user belongs to its company.'
    : `❌ FAIL — ${bad.length} orders assigned to a non-member. Sample: ${bad.slice(0, 10).join(', ')}`)
  process.exit(bad.length === 0 ? 0 : 1)
}

const token = await getToken()
console.log('✓ Dataverse authenticated')

// ── Discover: which order lookup points to a contact? ─────────────────────────
if (DISCOVER) {
  const sample = await dvFetchAll('/cr56f_wpp_orderses?$top=3', token)
  console.log('\nLookup fields on cr56f_wpp_orderses (→ target entity):')
  const seen = new Set()
  for (const row of sample) {
    for (const k of Object.keys(row)) {
      if (k.startsWith('_') && k.endsWith('_value') && !seen.has(k)) {
        seen.add(k)
        const target = row[`${k}@Microsoft.Dynamics.CRM.lookuplogicalname`] ?? '?'
        console.log(`  ${k.padEnd(40)} → ${target}`)
      }
    }
  }
  console.log('\nPick the one whose target is "contact" and pass --contact-field=<that>.\n')
  process.exit(0)
}

if (!CONTACT_FIELD) {
  console.error('❌ --contact-field is required. Run with --discover first to find it.')
  process.exit(1)
}

// ── 1. Supabase orders needing a user ─────────────────────────────────────────
const nullOrders = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb
    .from('orders').select('id, dataverse_id, company_id')
    .is('user_id', null).range(from, from + 999)
  if (error) { console.error('❌ orders read:', error.message); process.exit(1) }
  nullOrders.push(...data)
  if (data.length < 1000) break
}
console.log(`✓ ${nullOrders.length} orders with user_id = null`)
const targets = Number.isFinite(LIMIT) ? nullOrders.slice(0, LIMIT) : nullOrders

// ── 2. Dataverse order → contactId ────────────────────────────────────────────
// Lookups are selected by their `_<name>_value` form — stripping it makes the
// $select fail (and a silent id-only fallback made every order look contactless).
const dvOrders = await dvFetchAll(
  `/cr56f_wpp_orderses?$select=cr56f_wpp_ordersid,${CONTACT_FIELD}`, token)
const orderToContact = new Map()
for (const o of dvOrders) {
  const c = o[CONTACT_FIELD]
  if (c) orderToContact.set(o.cr56f_wpp_ordersid, c)
}
console.log(`✓ ${orderToContact.size}/${dvOrders.length} Dataverse orders have a contact`)

// ── 3. Dataverse contact → email + parent account (for cross-check) ───────────
const contacts = await dvFetchAll(
  '/contacts?$select=contactid,emailaddress1,_parentcustomerid_value&$filter=emailaddress1 ne null', token)
const contactToEmail = new Map()
const contactToAccount = new Map()
for (const c of contacts) {
  const email = (c.emailaddress1 ?? '').trim().toLowerCase()
  if (email) contactToEmail.set(c.contactid, email)
  if (c._parentcustomerid_value) contactToAccount.set(c.contactid, c._parentcustomerid_value)
}
console.log(`✓ ${contactToEmail.size} contacts with email`)

// Report duplicate emails (one email shared by ≥2 contacts) — these are the main
// source of potential mis-attribution; the membership guard below blocks the bad ones.
const emailCount = new Map()
for (const e of contactToEmail.values()) emailCount.set(e, (emailCount.get(e) ?? 0) + 1)
const dupEmails = [...emailCount.values()].filter(n => n > 1).length
if (dupEmails) console.log(`⚠ ${dupEmails} emails are shared by multiple contacts (cross-checked below)`)

// ── 4. email → Supabase user_id ───────────────────────────────────────────────
const emailToUser = new Map()
for (let page = 1; ; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) { console.error('❌ listUsers:', error.message); process.exit(1) }
  data.users.forEach(u => u.email && emailToUser.set(u.email.toLowerCase(), u.id))
  if (data.users.length < 1000) break
}
console.log(`✓ ${emailToUser.size} auth users`)

// Membership invariant: which (user|company) pairs are legitimate.
const membership = await loadMembership()
console.log(`✓ ${membership.size} user↔company memberships`)

// Optional fallback: company_admin per company
const adminByCompany = new Map()
if (FALLBACK_ADMIN) {
  const { data } = await sb.from('user_companies')
    .select('user_id, company_id').eq('is_company_admin', true)
  for (const r of data ?? []) if (!adminByCompany.has(r.company_id)) adminByCompany.set(r.company_id, r.user_id)
}

// ── 5. Resolve + cross-check + group ──────────────────────────────────────────
const byUser = new Map()        // userId → [orderId]  (to assign)
const unresolved = new Map()    // orderId → reason code (for import_note / admin list)
const miss = { noContact: 0, contactNotMigrated: 0, contactCompanyMismatch: 0, notMember: 0, fallback: 0 }
const mismatchSample = []
for (const o of targets) {
  const dvId = o.dataverse_id ?? o.id
  const contactId = orderToContact.get(dvId)
  let userId = null
  let reason = null

  if (!contactId) {
    reason = 'no_contact_on_order'; miss.noContact++
  } else {
    // CROSS-CHECK 1 (Dataverse): the contact's parent account must equal the
    // order's company. A mismatch means the contact lookup is inconsistent.
    const contactAccount = contactToAccount.get(contactId)
    if (o.company_id && contactAccount && contactAccount !== o.company_id) {
      reason = 'contact_company_mismatch'; miss.contactCompanyMismatch++
      if (mismatchSample.length < 10) mismatchSample.push(`order ${o.id}: contact acct ≠ order company`)
    } else {
      const email = contactToEmail.get(contactId)
      userId = email ? emailToUser.get(email) : null
      if (!userId) { reason = 'contact_not_migrated'; miss.contactNotMigrated++ }
    }
  }

  // Optional fallback to the company_admin (not for hard mismatch rejections).
  if (!userId && reason !== 'contact_company_mismatch' && FALLBACK_ADMIN
      && o.company_id && adminByCompany.has(o.company_id)) {
    userId = adminByCompany.get(o.company_id); reason = null; miss.fallback++
  }

  // CROSS-CHECK 2 (Supabase invariant): resolved user MUST belong to the order's
  // company. Catches email collisions etc. Never write a violating assignment.
  if (userId && o.company_id && !membership.has(`${userId}|${o.company_id}`)) {
    reason = 'user_not_member'; miss.notMember++
    if (mismatchSample.length < 10) mismatchSample.push(`order ${o.id}: user not member of company`)
    userId = null
  }

  if (!userId) { unresolved.set(o.id, reason ?? 'unresolved'); continue }
  if (!byUser.has(userId)) byUser.set(userId, [])
  byUser.get(userId).push(o.id)
}
const toUpdate = [...byUser.values()].reduce((n, a) => n + a.length, 0)

console.log('\n── Plan ──────────────────────────────────────')
console.log(`  Orders to backfill : ${toUpdate}`)
console.log(`  Distinct users     : ${byUser.size}`)
console.log(`  Unassigned (total) : ${unresolved.size}`)
console.log(`    · no contact on order      : ${miss.noContact}`)
console.log(`    · contact not migrated     : ${miss.contactNotMigrated}`)
console.log(`    · REJECTED acct ≠ company  : ${miss.contactCompanyMismatch}`)
console.log(`    · REJECTED not a member    : ${miss.notMember}`)
if (FALLBACK_ADMIN) console.log(`  Assigned via company_admin fallback: ${miss.fallback}`)
console.log(`  ✓ Reconciliation: ${toUpdate} + ${unresolved.size} = ${toUpdate + unresolved.size} (must equal ${targets.length} target orders)`)
if (mismatchSample.length) {
  console.log('  Mismatch sample:')
  mismatchSample.forEach(m => console.log(`    - ${m}`))
}

if (DRY_RUN) { console.log('\n[dry-run] No writes performed. Re-run with --verify after applying.\n'); process.exit(0) }

// ── 6. Apply assignments (grouped by user; clears any old import_note) ─────────
let done = 0
for (const [userId, ids] of byUser) {
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const { error } = await sb.from('orders').update({ user_id: userId, import_note: null }).in('id', chunk)
    if (error) { console.error('\n❌ update:', error.message); process.exit(1) }
    done += chunk.length
    process.stdout.write(`\r  updated ${done}/${toUpdate}`)
  }
}

// ── 7. Record the reason on unassigned orders (for the back-office list) ───────
const byReason = new Map()
for (const [orderId, reason] of unresolved) {
  if (!byReason.has(reason)) byReason.set(reason, [])
  byReason.get(reason).push(orderId)
}
for (const [reason, ids] of byReason) {
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await sb.from('orders').update({ import_note: reason }).in('id', ids.slice(i, i + 200))
    if (error) console.error(`\n⚠ import_note update (${reason}):`, error.message)
  }
}

console.log(`\n\n✅ Backfilled ${done} orders; ${unresolved.size} left unassigned (reason recorded).`)
console.log('   Now run:  node scripts/backfill-order-users.mjs --verify\n')
