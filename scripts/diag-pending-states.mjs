/**
 * Diagnose the "pending" bucket: split-brain (profiles.company_id vs user_companies)
 * and login state (confirmed / last_sign_in / must_set_password).
 * Usage: node scripts/diag-pending-states.mjs
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// all profiles
const profiles = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('profiles')
    .select('id, email, role, company_id, must_set_password, created_at')
    .range(from, from + 999)
  if (error) { console.error(error.message); process.exit(1) }
  profiles.push(...data)
  if (data.length < 1000) break
}

// all user_companies
const ucByUser = new Map()
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('user_companies').select('user_id').range(from, from + 999)
  if (error) { console.error(error.message); process.exit(1) }
  for (const r of data) ucByUser.set(r.user_id, (ucByUser.get(r.user_id) ?? 0) + 1)
  if (data.length < 1000) break
}

// auth users (login state)
const authById = new Map()
for (let page = 1; ; page++) {
  const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
  const us = data?.users ?? []
  for (const u of us) authById.set(u.id, u)
  if (us.length < 1000) break
}

const isAdmin = r => ['piedro_admin', 'super_admin', 'branch_admin', 'branch_staff'].includes(r)

let pendingUI = 0, splitBrain = 0, trulyPending = 0
let neverLoggedIn = 0, hasLoggedInButPending = 0, mustSet = 0
const splitBrainSamples = []

for (const p of profiles) {
  if (isAdmin(p.role)) continue
  const hasUC = (ucByUser.get(p.id) ?? 0) > 0
  if (hasUC) continue // not shown as pending
  pendingUI++ // appears in "pending" bucket today

  const au = authById.get(p.id)
  const loggedIn = !!au?.last_sign_in_at
  if (p.company_id) {
    splitBrain++ // has profiles.company_id but no user_companies → WRONGLY pending
    if (splitBrainSamples.length < 15) splitBrainSamples.push(`${p.email}  loggedIn=${loggedIn} must_set=${p.must_set_password}`)
  } else {
    trulyPending++ // no company anywhere
  }
  if (!loggedIn) neverLoggedIn++
  else if (p.company_id) hasLoggedInButPending++
  if (p.must_set_password) mustSet++
}

console.log(`\n=== "pending" bucket analysis (non-admin profiles) ===`)
console.log(`shown as pending in UI today:     ${pendingUI}`)
console.log(`  ├─ SPLIT-BRAIN (has company_id, no user_companies): ${splitBrain}`)
console.log(`  └─ truly no company anywhere:                       ${trulyPending}`)
console.log(`\nnever logged in (last_sign_in null): ${neverLoggedIn}`)
console.log(`must_set_password=true:              ${mustSet}`)
console.log(`have company_id AND already logged in (pure split-brain noise): ${hasLoggedInButPending}`)
console.log(`\n--- split-brain samples ---`)
for (const s of splitBrainSamples) console.log('  ' + s)
