import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: profiles } = await sb.from('profiles')
  .select('id, email, full_name, role, company_id, must_set_password, created_at')
const ucByUser = new Set()
const { data: uc } = await sb.from('user_companies').select('user_id')
for (const r of uc) ucByUser.add(r.user_id)
const authById = new Map()
for (let page = 1; ; page++) {
  const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
  for (const u of data?.users ?? []) authById.set(u.id, u)
  if ((data?.users ?? []).length < 1000) break
}
const isAdmin = r => ['piedro_admin','super_admin','branch_admin','branch_staff'].includes(r)
console.log('\n=== users shown as PENDING (no user_companies, non-admin) ===')
for (const p of profiles) {
  if (isAdmin(p.role) || ucByUser.has(p.id)) continue
  const au = authById.get(p.id)
  console.log(`\n  ${p.email}  (${p.full_name || '—'})`)
  console.log(`    role=${p.role} company_id=${p.company_id ?? 'NULL'} must_set=${p.must_set_password}`)
  console.log(`    confirmed=${au?.email_confirmed_at ? 'yes':'NO'} last_sign_in=${au?.last_sign_in_at ?? 'never'} created=${p.created_at}`)
}
