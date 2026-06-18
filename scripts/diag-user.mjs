/**
 * Diagnose a user's login/reset state across profiles + auth.users + reset tokens.
 * Usage: node scripts/diag-user.mjs <email-or-domain-fragment>
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

const frag = (process.argv[2] ?? 'buchrnhornen').toLowerCase()

const { data: profiles, error } = await sb.from('profiles')
  .select('id, email, role, must_set_password, company_id, preferred_locale, created_at')
  .ilike('email', `%${frag}%`)
if (error) { console.error('profiles error:', error.message); process.exit(1) }

console.log(`\n=== profiles matching "${frag}" (${profiles.length}) ===`)
for (const p of profiles) {
  console.log(`\n  profile: ${p.email}`)
  console.log(`    id=${p.id}  role=${p.role}  must_set_password=${p.must_set_password}`)
  console.log(`    company_id=${p.company_id}  locale=${p.preferred_locale}  created=${p.created_at}`)

  // matching auth user
  const { data: au } = await sb.auth.admin.getUserById(p.id)
  if (!au?.user) {
    console.log(`    auth.users: ❌ NO AUTH USER for this id`)
  } else {
    const u = au.user
    console.log(`    auth.users: email=${u.email}  confirmed=${u.email_confirmed_at ? 'yes' : 'NO'}  last_sign_in=${u.last_sign_in_at ?? 'never'}`)
    console.log(`               created=${u.created_at}  banned_until=${u.banned_until ?? '-'}`)
  }

  // reset tokens
  const { data: toks } = await sb.from('password_reset_tokens')
    .select('created_at, expires_at, used_at').eq('user_id', p.id)
    .order('created_at', { ascending: false }).limit(5)
  console.log(`    reset tokens (${toks?.length ?? 0}):`)
  for (const t of toks ?? []) console.log(`      created=${t.created_at} expires=${t.expires_at} used=${t.used_at ?? '-'}`)
}

// also check auth.users directly by email fragment (in case profile email differs)
const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 })
const au = (list?.users ?? []).filter(u => (u.email ?? '').toLowerCase().includes(frag))
console.log(`\n=== auth.users matching "${frag}" (${au.length}) ===`)
for (const u of au) {
  console.log(`  ${u.email}  id=${u.id}  confirmed=${u.email_confirmed_at ? 'yes' : 'NO'}  last_sign_in=${u.last_sign_in_at ?? 'never'}`)
}
