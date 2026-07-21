import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const ERP_CODE = '080159'
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)
const pad = (s: unknown, n: number) => String(s).padEnd(n)

async function main() {
  const { data: companies } = await sb.from('companies')
    .select('id, name, insights_enabled').eq('erp_code', ERP_CODE)
  const ids = companies!.map(c => c.id)
  const nameById = new Map(companies!.map(c => [c.id, c.name]))
  console.log('insights_enabled per company:', companies!.map(c => `${c.name.replace('Voetmax - LOCATIE ', '')}=${c.insights_enabled}`).join(', '))

  const { data: ucs } = await sb.from('user_companies')
    .select('user_id, company_id, is_company_admin').in('company_id', ids)
  if (!ucs?.length) { console.log('\nNo users linked to any Voetmax company.'); return }

  const userIds = [...new Set(ucs.map(u => u.user_id))]
  const { data: profiles } = await sb.from('profiles').select('id, email, full_name, role').in('id', userIds)
  const profById = new Map((profiles ?? []).map(p => [p.id, p]))

  console.log(`\n=== ${userIds.length} user(s) linked to Voetmax ===`)
  for (const uid of userIds) {
    const p = (profById.get(uid) ?? {}) as { email?: string; full_name?: string; role?: string }
    const links = ucs.filter(u => u.user_id === uid)
    const nAdmin = links.filter(l => l.is_company_admin).length
    console.log(`  ${pad(p.email ?? uid, 36)} ${pad(p.full_name ?? '', 22)} role=${pad(p.role, 14)} companies=${links.length} admin_of=${nAdmin}`)
    for (const l of links) console.log(`       - ${l.is_company_admin ? 'ADMIN ' : 'member'} ${nameById.get(l.company_id)}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
