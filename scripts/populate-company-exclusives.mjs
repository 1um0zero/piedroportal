/**
 * Populate company_exclusives (N:N company ↔ sigla) from Dataverse contacts.
 *
 * Source: contact.adx_profilealertinstructions holds the user's sigla(s) as free
 * text. We extract only KNOWN siglas (the tokens that actually appear in some
 * style's cr56f_exclusive), map the contact to its company (contact.
 * _parentcustomerid_value == our companies.id), and record (company, sigla).
 *
 * Junk is ignored: contacts listing >3 known siglas (the "all siglas" test rows)
 * and companies whose name contains TEST. A sigla like LIV legitimately lands on
 * many companies (the Livingston group).
 *
 *   node scripts/populate-company-exclusives.mjs            → report only
 *   node scripts/populate-company-exclusives.mjs --apply    → write
 *
 * Requires migration 016 (company_exclusives) before --apply.
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
const MAX_SIGLAS = 3   // a contact with more known siglas than this is treated as junk

async function token() {
  const r = await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${env.DATAVERSE_URL}/.default` }),
  })
  return (await r.json()).access_token
}

async function main() {
  const T = await token()
  const get = async (u) => {
    const r = await fetch(API + u, { headers: { Authorization: `Bearer ${T}`, Prefer: 'odata.maxpagesize=2000' } })
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 150)}`)
    return r.json()
  }
  const all = async (p) => {
    let url = API + p, out = []
    while (url) { const r = await fetch(url, { headers: { Authorization: `Bearer ${T}`, Prefer: 'odata.maxpagesize=2000' } }); const j = await r.json(); if (j.error) throw new Error(j.error.message); out.push(...(j.value ?? [])); url = j['@odata.nextLink'] || null }
    return out
  }

  // KNOWN siglas = tokens that appear on some style's exclusive
  const st = await get(`/cr56f_wpp_styleses?$select=cr56f_exclusive&$top=5000`)
  const KNOWN = new Set()
  for (const r of st.value) (r.cr56f_exclusive || '').toUpperCase().match(/[A-Z0-9]+/g)?.forEach(t => KNOWN.add(t))
  console.log('known style siglas:', [...KNOWN].sort().join(', '))

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  let comps = [], from = 0
  while (true) { const { data } = await sb.from('companies').select('id,name').range(from, from + 999); comps = comps.concat(data); if (data.length < 1000) break; from += 1000 }
  const compById = new Map(comps.map(c => [c.id, c.name]))

  const contacts = await all(`/contacts?$select=emailaddress1,adx_profilealertinstructions,_parentcustomerid_value&$filter=statecode eq 0 and adx_profilealertinstructions ne null`)

  const pairs = new Map() // company_id → Set(labels)
  let skippedJunk = 0, skippedNoCompany = 0
  for (const c of contacts) {
    const cid = c._parentcustomerid_value
    const cname = compById.get(cid)
    if (!cid || !cname) { skippedNoCompany++; continue }
    if (/\bTEST/i.test(cname)) { skippedJunk++; continue }
    const toks = [...new Set((c.adx_profilealertinstructions.toUpperCase().match(/[A-Z0-9]+/g) || []).filter(t => KNOWN.has(t)))]
    if (toks.length === 0) continue
    if (toks.length > MAX_SIGLAS) { skippedJunk++; continue } // "all siglas" junk row
    if (!pairs.has(cid)) pairs.set(cid, new Set())
    toks.forEach(t => pairs.get(cid).add(t))
  }

  const rows = []
  for (const [cid, labels] of pairs) for (const label of labels) rows.push({ company_id: cid, label })

  // Report by label
  const byLabel = {}
  for (const r of rows) byLabel[r.label] = (byLabel[r.label] || 0) + 1
  console.log(`\ncompany_exclusives rows: ${rows.length} (over ${pairs.size} companies)`)
  console.log('by sigla (companies):', byLabel)
  console.log('skipped junk contacts:', skippedJunk, '| skipped no/unknown company:', skippedNoCompany)
  // show ZSM + KIV companies explicitly
  for (const sig of ['ZSM', 'KIV']) {
    const names = rows.filter(r => r.label === sig).map(r => compById.get(r.company_id))
    console.log(`  ${sig} →`, names.join(' | '))
  }

  if (!APPLY) { console.log('\n(run with --apply to write)'); return }
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await sb.from('company_exclusives').upsert(rows.slice(i, i + 200), { onConflict: 'company_id,label' })
    if (error) { console.error('✗ upsert:', error.message); process.exit(1) }
  }
  console.log(`\n✅ upserted ${rows.length} company_exclusives rows`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
