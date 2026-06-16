/** Read-only: list branches + their admins/clients, to plan customerservice fix. */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: branches } = await sb.from('branches')
  .select('id, name, handles_unassigned_clients')
console.log('branches:', branches?.length ?? 0)
for (const b of branches ?? []) {
  const { count: admins } = await sb.from('branch_admins')
    .select('*', { count: 'exact', head: true }).eq('branch_id', b.id)
  const { count: clients } = await sb.from('branch_companies')
    .select('*', { count: 'exact', head: true }).eq('branch_id', b.id)
  console.log(`  - ${b.name} (${b.id}) catchAll=${b.handles_unassigned_clients} admins=${admins} clients=${clients}`)
}

const { count: totalCompanies } = await sb.from('companies')
  .select('*', { count: 'exact', head: true })
console.log('total companies:', totalCompanies)
