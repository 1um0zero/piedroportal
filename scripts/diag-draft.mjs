/**
 * Diagnose ownership of a specific order/draft: who created it, what company,
 * status, and which users belong to that company (to see who could be "saving"
 * it vs. who owns it). Usage: node scripts/diag-draft.mjs <orderId>
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

const id = process.argv[2] ?? '324b7758-14f0-47c3-98cb-6e7559165043'

const { data: o, error } = await sb.from('orders')
  .select('id, order_seq, status, user_id, company_id, reference_customer, patient_name, created_at, updated_at, approval_state, production_state')
  .eq('id', id).single()
if (error) { console.error('order error:', error.message); process.exit(1) }

console.log(`\n=== order ${id} ===`)
console.log(o)

if (o.user_id) {
  const { data: owner } = await sb.from('profiles')
    .select('id, email, full_name, role, company_id').eq('id', o.user_id).single()
  console.log('\n--- creator (orders.user_id) ---')
  console.log(owner ?? '(no profile row for user_id!)')
}

if (o.company_id) {
  const { data: comp } = await sb.from('companies')
    .select('id, name, erp_code').eq('id', o.company_id).single()
  console.log('\n--- order company ---')
  console.log(comp)

  // users linked to that company via user_companies
  const { data: links } = await sb.from('user_companies')
    .select('user_id, profiles:user_id (email, full_name, role)')
    .eq('company_id', o.company_id)
  console.log(`\n--- user_companies members of ${comp?.name} (${links?.length ?? 0}) ---`)
  for (const l of links ?? []) console.log(`  ${l.user_id}  ${l.profiles?.email}  role=${l.profiles?.role}`)

  const ownerInCompany = (links ?? []).some(l => l.user_id === o.user_id)
  console.log(`\n  creator is member of order company via user_companies? ${ownerInCompany}`)
}
