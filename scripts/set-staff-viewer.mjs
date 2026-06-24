/**
 * Promote a user to the staff_viewer role (global, read-only orders consultant).
 * Requires migration 043 to have run (the role CHECK constraint), else the UPDATE
 * fails with a constraint violation.
 * Usage: node scripts/set-staff-viewer.mjs <email>
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
if (!email) { console.error('Usage: node scripts/set-staff-viewer.mjs <email>'); process.exit(1) }

const { data: profile, error: findErr } = await sb
  .from('profiles').select('id, email, role').ilike('email', email).maybeSingle()
if (findErr) { console.error('lookup error:', findErr.message); process.exit(1) }
if (!profile) { console.error('no profile for', email); process.exit(1) }

const { error } = await sb.from('profiles').update({ role: 'staff_viewer' }).eq('id', profile.id)
if (error) { console.error('update failed:', error.message, '\n(did migration 043 run?)'); process.exit(1) }
console.log(`✓ ${profile.email}: ${profile.role} → staff_viewer`)
