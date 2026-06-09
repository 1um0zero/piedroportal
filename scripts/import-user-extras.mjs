/**
 * Import per-user extras from Dataverse contacts → Supabase profiles/wishlist,
 * and report user↔company association issues.
 *
 *   language : contact.mspp_userpreferredlcid (LCID) → profiles.preferred_locale
 *   names    : contact.firstname / lastname          → profiles.first_name/last_name
 *   wishlist : contact.description ("2480K.0126,...") → wishlist_items (by colour_id)
 *
 *   node scripts/import-user-extras.mjs            → report only
 *   node scripts/import-user-extras.mjs --apply    → write
 *
 * Requires migration 016 (profiles.first_name/last_name) before --apply.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))

const API = `${env.DATAVERSE_URL}/api/data/v9.2`
const APPLY = process.argv.includes('--apply')

// Power Pages LCID → app locale (en/nl/fr/de); everything else falls back to en.
const LCID = { 1043: 'nl', 2067: 'nl', 1033: 'en', 2057: 'en', 1031: 'de', 3079: 'de', 1036: 'fr', 2060: 'fr' }
const toLocale = (lcid) => LCID[Number(lcid)] ?? 'en'

async function token() {
  const r = await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${env.DATAVERSE_URL}/.default` }),
  })
  return (await r.json()).access_token
}

async function main() {
  const T = await token()
  const all = async (p) => {
    let url = API + p, out = []
    while (url) { const r = await fetch(url, { headers: { Authorization: `Bearer ${T}`, Prefer: 'odata.maxpagesize=2000' } }); const j = await r.json(); if (j.error) throw new Error(j.error.message); out.push(...(j.value ?? [])); url = j['@odata.nextLink'] || null }
    return out
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Load profiles (email → row) and products (colour_id → id), companies (id → name)
  const load = async (table, cols) => { let rows = [], from = 0; while (true) { const { data, error } = await sb.from(table).select(cols).range(from, from + 999); if (error) throw new Error(`${table}: ${error.message}`); rows = rows.concat(data); if (data.length < 1000) break; from += 1000 } return rows }
  const profiles = await load('profiles', 'id,email,preferred_locale,first_name,last_name')
  const profByEmail = new Map(profiles.map(p => [(p.email || '').toLowerCase(), p]))
  const products = await load('products', 'id,colour_id')
  const prodByColour = new Map(products.map(p => [p.colour_id.toUpperCase(), p.id]))
  const companies = await load('companies', 'id,name')
  const compById = new Map(companies.map(c => [c.id, c.name]))
  const links = await load('user_companies', 'user_id,company_id')
  const linkedUsers = new Set(links.map(l => l.user_id))

  const contacts = await all(`/contacts?$select=emailaddress1,firstname,lastname,mspp_userpreferredlcid,description,_parentcustomerid_value&$filter=statecode eq 0 and emailaddress1 ne null`)
  console.log(`active contacts with email: ${contacts.length}`)

  // ── Build profile patches + wishlist rows ──
  const profilePatches = [], wishRows = []
  let matched = 0, unmatched = 0, wlResolved = 0, wlMissing = []
  for (const c of contacts) {
    const email = c.emailaddress1.toLowerCase()
    const prof = profByEmail.get(email)
    if (!prof) { unmatched++; continue }
    matched++
    const patch = { id: prof.id }
    const locale = toLocale(c.mspp_userpreferredlcid)
    if (locale !== prof.preferred_locale) patch.preferred_locale = locale
    if ((c.firstname || null) !== prof.first_name) patch.first_name = c.firstname || null
    if ((c.lastname || null) !== prof.last_name) patch.last_name = c.lastname || null
    if (Object.keys(patch).length > 1) profilePatches.push(patch)

    for (const raw of (c.description || '').split(',').map(s => s.trim()).filter(Boolean)) {
      const pid = prodByColour.get(raw.toUpperCase())
      if (pid) { wishRows.push({ user_id: prof.id, product_id: pid }); wlResolved++ }
      else wlMissing.push(raw)
    }
  }

  console.log(`\n── profiles ──  matched ${matched}, unmatched (no portal account) ${unmatched}`)
  console.log(`  patches to apply: ${profilePatches.length} (locale/first/last)`)
  console.log(`── wishlist ──  resolved items ${wlResolved}, unresolved colour_ids ${wlMissing.length}`)
  if (wlMissing.length) console.log('   unresolved:', [...new Set(wlMissing)].slice(0, 20).join(', '))

  // ── Validation report (user ↔ company) ──
  const noCompanyContacts = contacts.filter(c => !c._parentcustomerid_value || !compById.has(c._parentcustomerid_value))
  const profilesNoLink = profiles.filter(p => !linkedUsers.has(p.id))
  console.log(`\n── validation ──`)
  console.log(`  contacts whose Dataverse company is missing in our DB: ${noCompanyContacts.length}`)
  console.log(`  profiles with NO company link (user_companies): ${profilesNoLink.length}`)
  console.log(`     e.g.`, profilesNoLink.slice(0, 8).map(p => p.email).join(', '))

  if (!APPLY) { console.log('\n(run with --apply to write profiles + wishlist)'); return }

  for (let i = 0; i < profilePatches.length; i += 100) {
    const { error } = await sb.from('profiles').upsert(profilePatches.slice(i, i + 100), { onConflict: 'id' })
    if (error) { console.error('✗ profiles:', error.message); process.exit(1) }
  }
  // dedupe wishlist rows
  const seen = new Set(), wl = []
  for (const r of wishRows) { const k = `${r.user_id}|${r.product_id}`; if (!seen.has(k)) { seen.add(k); wl.push(r) } }
  for (let i = 0; i < wl.length; i += 200) {
    const { error } = await sb.from('wishlist_items').upsert(wl.slice(i, i + 200), { onConflict: 'user_id,product_id' })
    if (error) { console.error('✗ wishlist:', error.message); process.exit(1) }
  }
  console.log(`\n✅ applied ${profilePatches.length} profile patches + ${wl.length} wishlist items`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
