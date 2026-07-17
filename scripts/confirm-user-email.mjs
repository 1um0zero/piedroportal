/**
 * Admin-confirm a user's email address (Gate A) without an email round-trip.
 *
 * Gate A exists to prove the person controls the mailbox. Use this ONLY when
 * that proof already exists by other means — e.g. the person replied to us from
 * that same address, or a known client contact vouches for it in writing. It is
 * not a shortcut for "the link keeps expiring"; fix the link instead.
 *
 * Gate B (linking the account to a company) is untouched — the user still cannot
 * order until an admin assigns their company.
 *
 * Usage: node scripts/confirm-user-email.mjs <email> [<email> ...]
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

const emails = process.argv.slice(2).map(e => e.trim().toLowerCase()).filter(Boolean)
if (!emails.length) {
  console.error('Usage: node scripts/confirm-user-email.mjs <email> [<email> ...]')
  process.exit(1)
}

// listUsers is paginated; page through until we have every address we need.
const found = new Map()
for (let page = 1; page <= 20; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) { console.error('listUsers:', error.message); process.exit(1) }
  for (const u of data.users) {
    const e = (u.email ?? '').toLowerCase()
    if (emails.includes(e)) found.set(e, u)
  }
  if (data.users.length < 1000) break
}

for (const email of emails) {
  const u = found.get(email)
  if (!u) { console.log(`❌ ${email} — no auth user`); continue }
  if (u.email_confirmed_at) { console.log(`•  ${email} — already confirmed (${u.email_confirmed_at})`); continue }

  const { error } = await sb.auth.admin.updateUserById(u.id, { email_confirm: true })
  if (error) { console.log(`❌ ${email} — ${error.message}`); continue }

  const { data: prof } = await sb.from('profiles').select('company_id').eq('id', u.id).single()
  console.log(`✅ ${email} — confirmed${prof?.company_id ? '' : '  (still pending company assignment — Gate B)'}`)
}
