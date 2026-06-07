/**
 * Set a user's role (and clear any pending password reset). Handy for assigning
 * piedro_admin / branch_staff to Piedro staff (Q4.4).
 *
 * Usage: node scripts/set-admin.mjs <email> [role]
 *   role defaults to "piedro_admin"; valid: user | company_admin | piedro_admin | branch_staff
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

const email = process.argv[2]
const role = process.argv[3] ?? 'piedro_admin'
const VALID = ['user', 'company_admin', 'piedro_admin', 'branch_staff']
if (!email || !VALID.includes(role)) {
  console.error('Usage: node scripts/set-admin.mjs <email> [user|company_admin|piedro_admin|branch_staff]')
  process.exit(1)
}

const { data, error } = await sb.from('profiles')
  .update({ role, must_set_password: false })
  .ilike('email', email)
  .select('email, role')
if (error) { console.error('❌', error.message); process.exit(1) }
if (!data?.length) { console.error(`❌ no profile found for ${email}`); process.exit(1) }
console.log(`✅ ${data[0].email} → role=${data[0].role} (must_set_password cleared)`)
