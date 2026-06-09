/**
 * Sync product exclusivity siglas from Dataverse → Supabase.
 *
 * Each Dataverse style (cr56f_wpp_styles) has `cr56f_exclusive` holding zero or
 * more siglas (e.g. "ZSM", "LIV KIV"). We copy it (UPPERCASE, trimmed) to
 * products.exclusive on every colour variant of the style. A non-empty value
 * makes the model customer-exclusive; visibility is by token intersection with
 * the user's company siglas (see src/lib/exclusive.ts + company_exclusives).
 *
 *   node scripts/sync-exclusives.mjs            → report only
 *   node scripts/sync-exclusives.mjs --apply    → write products.exclusive
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
  const st = await get(`/cr56f_wpp_styleses?$select=cr56f_name,cr56f_exclusive&$top=5000`)
  const want = new Map() // style → UPPERCASE exclusive ('' if none)
  for (const r of st.value) want.set(r.cr56f_name, (r.cr56f_exclusive || '').trim().toUpperCase())

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  let rows = [], from = 0
  while (true) {
    const { data } = await sb.from('products').select('style_name,exclusive').range(from, from + 999)
    rows = rows.concat(data); if (data.length < 1000) break; from += 1000
  }
  const curByStyle = new Map()
  for (const r of rows) if (!curByStyle.has(r.style_name)) curByStyle.set(r.style_name, (r.exclusive || '').trim().toUpperCase())

  const dist = {}, changes = []
  for (const [style, cur] of curByStyle) {
    const target = want.get(style) ?? ''
    if (target) dist[target] = (dist[target] || 0) + 1
    if (cur !== target) changes.push({ style, from: cur || '(none)', to: target || '(none)' })
  }
  console.log('exclusive distribution (styles):', dist)
  console.log(`\n${changes.length} styles change:`)
  changes.slice(0, 40).forEach(c => console.log(`  ${c.style}: ${c.from} → ${c.to}`))

  if (!APPLY) { console.log('\n(run with --apply to write)'); return }
  let n = 0
  for (const c of changes) {
    const { error } = await sb.from('products').update({ exclusive: want.get(c.style) ?? '' }).eq('style_name', c.style)
    if (error) console.error(`  ✗ ${c.style}: ${error.message}`); else n++
  }
  console.log(`\n✅ updated ${n} styles`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
