/**
 * One-off remediation: the first import-contacts run clobbered the profile of any
 * pre-existing user that also matched a Dataverse contact (set role='user' +
 * must_set_password=true). This restores tavares@umzero.pt to piedro_admin and
 * prints the oldest accounts so we can spot any other affected admin.
 *
 * Usage: node scripts/restore-admin.mjs
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

// 1. Oldest auth users (the pre-existing accounts).
const all = []
for (let page = 1; ; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) { console.error('listUsers:', error.message); process.exit(1) }
  all.push(...data.users)
  if (data.users.length < 1000) break
}
all.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
const oldest = all.slice(0, 12)

const { data: profs } = await sb.from('profiles')
  .select('id, email, role, must_set_password')
  .in('id', oldest.map(u => u.id))
const byId = new Map((profs ?? []).map(p => [p.id, p]))

console.log('\nOldest accounts (pre-existing — check for wrongly-demoted admins):')
for (const u of oldest) {
  const p = byId.get(u.id) ?? {}
  console.log(`  ${u.created_at.slice(0, 10)}  ${(u.email ?? '').padEnd(34)} role=${(p.role ?? '?').padEnd(13)} must_set_password=${p.must_set_password ?? '?'}`)
}

// 2. Restore the known admin.
const { error: upErr } = await sb.from('profiles')
  .update({ role: 'piedro_admin', must_set_password: false })
  .ilike('email', 'tavares@umzero.pt')
console.log(upErr ? `\n❌ restore failed: ${upErr.message}` : '\n✅ tavares@umzero.pt restored to piedro_admin (must_set_password cleared)')
