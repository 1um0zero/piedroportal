/** REVERT: customerservice@ back to branch_staff, drop branch_admins row,
 *  ensure profiles.branch_id = NL branch. Then print full state. */
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

const { data: p } = await sb.from('profiles')
  .select('id, email, role, branch_id, company_id')
  .ilike('email', 'customerservice@piedro.com').single()

await sb.from('branch_admins').delete().eq('user_id', p.id)
await sb.from('profiles')
  .update({ role: 'branch_staff', branch_id: NL_BRANCH })
  .eq('id', p.id)

const { data: after } = await sb.from('profiles')
  .select('id, email, role, branch_id, company_id').eq('id', p.id).single()
const { count: ba } = await sb.from('branch_admins')
  .select('*', { count: 'exact', head: true }).eq('user_id', p.id)
console.log('after:', after, 'branch_admins rows:', ba)
