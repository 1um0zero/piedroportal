/**
 * Grant/revoke the granular orders_approval capability on a branch_staff user.
 * Lets them approve orders + set the Piedro Order # (within their model scope)
 * WITHOUT any other back-office power. Requires migration 044 (the
 * profiles.can_approve_orders column) to have run.
 * Usage: node scripts/set-approve-orders.mjs <email> [on|off]   (default: on)
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const email = (process.argv[2] ?? '').trim().toLowerCase()
const on = (process.argv[3] ?? 'on').trim().toLowerCase() !== 'off'
if (!email) { console.error('Usage: node scripts/set-approve-orders.mjs <email> [on|off]'); process.exit(1) }

const { data: profile, error: findErr } = await sb
  .from('profiles').select('id, email, role, can_approve_orders').ilike('email', email).maybeSingle()
if (findErr) { console.error('lookup error:', findErr.message); process.exit(1) }
if (!profile) { console.error('no profile for', email); process.exit(1) }
if (profile.role !== 'branch_staff') {
  console.error(`✗ ${profile.email} is ${profile.role}, not branch_staff — only branch_staff carries this capability.`)
  process.exit(1)
}

const { error } = await sb.from('profiles').update({ can_approve_orders: on }).eq('id', profile.id)
if (error) { console.error('update failed:', error.message, '\n(did migration 044 run?)'); process.exit(1) }
console.log(`✓ ${profile.email}: can_approve_orders ${profile.can_approve_orders} → ${on}`)
