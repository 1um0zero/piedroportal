/** Analyze contact_company_mismatch pairs: contact's account vs order's company. */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DV_URL = env.DATAVERSE_URL
const API = `${DV_URL}/api/data/v9.2`

const tok = await fetch(
  `https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,
  { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID,
      client_secret: env.DATAVERSE_CLIENT_SECRET, scope: `${DV_URL}/.default` }) })
  .then(r => r.json()).then(j => j.access_token)
const headers = { Authorization: `Bearer ${tok}`, Accept: 'application/json',
  Prefer: 'odata.maxpagesize=2000' }

async function all(path) {
  let url = `${API}${path}`; const out = []
  while (url) {
    const j = await fetch(url, { headers }).then(r => r.json())
    if (j.error) throw new Error(j.error.message)
    out.push(...(j.value ?? [])); url = j['@odata.nextLink'] ?? null
  }
  return out
}

// Supabase unassigned orders
const orders = []
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('orders')
    .select('id, dataverse_id, company_id, companies(name)')
    .is('user_id', null).range(from, from + 999)
  orders.push(...data); if (data.length < 1000) break
}

const dvOrders = await all('/cr56f_wpp_orderses?$select=cr56f_wpp_ordersid,_cr56f_user_value')
const o2c = new Map(dvOrders.filter(o => o._cr56f_user_value).map(o => [o.cr56f_wpp_ordersid, o._cr56f_user_value]))

const contacts = await all('/contacts?$select=contactid,fullname,emailaddress1,_parentcustomerid_value')
const cMap = new Map(contacts.map(c => [c.contactid, c]))
const accounts = await all('/accounts?$select=accountid,name')
const aMap = new Map(accounts.map(a => [a.accountid, a.name]))

// user_companies membership + auth users
const membership = new Set()
for (let from = 0; ; from += 1000) {
  const { data } = await sb.from('user_companies').select('user_id, company_id').range(from, from + 999)
  data.forEach(r => membership.add(`${r.user_id}|${r.company_id}`))
  if (data.length < 1000) break
}
const emailToUser = new Map()
for (let page = 1; ; page++) {
  const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
  data.users.forEach(u => u.email && emailToUser.set(u.email.toLowerCase(), u.id))
  if (data.users.length < 1000) break
}

const pairs = new Map()
let rescueable = 0
for (const o of orders) {
  const cid = o2c.get(o.dataverse_id ?? o.id)
  if (!cid) continue
  const c = cMap.get(cid)
  if (!c?._parentcustomerid_value || !o.company_id) continue
  if (c._parentcustomerid_value === o.company_id) continue
  const key = `${aMap.get(c._parentcustomerid_value) ?? c._parentcustomerid_value}  ⇒  ${o.companies?.name ?? o.company_id}  (${c.fullname})`
  pairs.set(key, (pairs.get(key) ?? 0) + 1)
  const uid = emailToUser.get((c.emailaddress1 ?? '').toLowerCase())
  if (uid && membership.has(`${uid}|${o.company_id}`)) rescueable++
}
console.log('Mismatch pairs (contact account ⇒ order company):')
;[...pairs.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(4)}  ${k}`))
console.log(`\nOf these, resolvable user IS a member (user_companies) of the order company: ${rescueable}`)
