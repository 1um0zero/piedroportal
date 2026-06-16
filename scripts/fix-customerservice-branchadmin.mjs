/** Make customerservice@piedro.com a branch_admin of the NL (catch-all) branch. */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const NL_BRANCH = 'b9eacdde-7266-4925-b1ad-ead73056e3a0'

const { data: prof, error: pe } = await sb.from('profiles')
  .update({ role: 'branch_admin' })
  .ilike('email', 'customerservice@piedro.com')
  .select('id, email, role').single()
if (pe) { console.error('role update failed:', pe.message); process.exit(1) }
console.log('role set:', prof.email, '→', prof.role)

const { error: be } = await sb.from('branch_admins')
  .upsert({ branch_id: NL_BRANCH, user_id: prof.id }, { onConflict: 'branch_id,user_id' })
if (be) { console.error('branch_admins insert failed:', be.message); process.exit(1) }
console.log('linked as branch_admin of NL branch', NL_BRANCH)

const { count } = await sb.from('branch_admins')
  .select('*', { count: 'exact', head: true }).eq('user_id', prof.id)
console.log('branch_admins rows now:', count)
