/**
 * Sync companies.sees_general_catalogue from Dataverse contacts (the "*" rule).
 *
 * A company sees the general Piedro catalogue (TRUE) unless it has exclusive
 * siglas but NONE of its contacts carries a "*" → then it is exclusive-only
 * (FALSE), e.g. ZSM. Mirrors the legacy gallery rule (see
 * docs/legacy/gallery-catalogue.liquid go_ahead block). Re-run after each
 * Dataverse import (the "*" is dropped by the sigla tokenizer elsewhere).
 *
 *   node scripts/sync-sees-general-catalogue.mjs            → report only
 *   node scripts/sync-sees-general-catalogue.mjs --apply    → write the column
 *
 * Requires migration 038 before --apply.
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

async function token() {
  const r = await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${env.DATAVERSE_URL}/.default` }) })
  return (await r.json()).access_token
}
const T = await token()
const get = async (u) => {
  const r = await fetch(API + u, { headers: { Authorization: `Bearer ${T}` } })
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 150)}`)
  return r.json()
}
const all = async (p) => {
  let url = API + p, out = []
  while (url) { const r = await fetch(url, { headers: { Authorization: `Bearer ${T}`, Prefer: 'odata.maxpagesize=2000' } }); const j = await r.json(); if (j.error) throw new Error(j.error.message); out.push(...(j.value ?? [])); url = j['@odata.nextLink'] || null }
  return out
}

// KNOWN siglas = tokens that appear on some style's exclusive (ignore free-text junk)
const st = await get(`/cr56f_wpp_styleses?$select=cr56f_exclusive&$top=5000`)
const KNOWN = new Set()
for (const r of st.value) (r.cr56f_exclusive || '').toUpperCase().match(/[A-Z0-9]+/g)?.forEach(t => KNOWN.add(t))

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
let comps = [], from = 0
while (true) { const { data } = await sb.from('companies').select('id,name,sees_general_catalogue').range(from, from + 999); comps = comps.concat(data); if (data.length < 1000) break; from += 1000 }
const compById = new Map(comps.map(c => [c.id, c]))

const contacts = await all(`/contacts?$select=adx_profilealertinstructions,_parentcustomerid_value&$filter=statecode eq 0 and adx_profilealertinstructions ne null`)

// Per company: does any contact carry a "*"? does any carry a known sigla?
const agg = new Map() // cid → { star, sigla }
for (const c of contacts) {
  const cid = c._parentcustomerid_value
  if (!cid || !compById.has(cid)) continue
  const raw = c.adx_profilealertinstructions || ''
  const toks = (raw.toUpperCase().match(/[A-Z0-9]+/g) || []).filter(t => KNOWN.has(t))
  if (!agg.has(cid)) agg.set(cid, { star: false, sigla: false })
  const a = agg.get(cid)
  if (raw.includes('*')) a.star = true
  if (toks.length) a.sigla = true
}

// Exclusive-only = has siglas but no "*". Everything else sees the general catalogue.
const updates = [] // { id, name, next }
for (const [cid, a] of agg) {
  const exclusiveOnly = a.sigla && !a.star
  const next = !exclusiveOnly
  const cur = compById.get(cid)
  if (cur.sees_general_catalogue !== next) updates.push({ id: cid, name: cur.name, next })
}

const goingFalse = updates.filter(u => !u.next)
console.log(`companies: ${comps.length}, with sigla text: ${agg.size}`)
console.log(`changes: ${updates.length} (→ exclusive-only: ${goingFalse.length})`)
console.log('\n== exclusive-only (sees_general_catalogue → false) ==')
for (const u of updates.filter(u => !u.next).sort((a,b)=>a.name.localeCompare(b.name))) console.log(`  ${u.name}`)
const goingTrue = updates.filter(u => u.next)
if (goingTrue.length) { console.log('\n== back to general (→ true) =='); for (const u of goingTrue) console.log(`  ${u.name}`) }

if (!APPLY) { console.log('\n(report only — pass --apply to write)'); process.exit(0) }
for (const u of updates) {
  const { error } = await sb.from('companies').update({ sees_general_catalogue: u.next }).eq('id', u.id)
  if (error) console.error(`  ✗ ${u.name}: ${error.message}`)
}
console.log(`\n✅ applied ${updates.length} updates`)
