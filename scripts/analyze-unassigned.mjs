/** One-off analysis of orders with user_id = null: reasons, dates, companies. */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('orders')
    .select('id, dataverse_id, import_note, created_at, status, company_id, companies(name)')
    .is('user_id', null).range(from, from + 999)
  if (error) { console.error(error.message); process.exit(1) }
  rows.push(...data)
  if (data.length < 1000) break
}
console.log(`Total unassigned: ${rows.length}`)

const count = (fn) => {
  const m = new Map()
  rows.forEach(r => { const k = fn(r); m.set(k, (m.get(k) ?? 0) + 1) })
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

console.log('\nBy import_note:')
count(r => r.import_note ?? 'NULL').forEach(([k, n]) => console.log(`  ${k}: ${n}`))

console.log('\nBy dataverse origin:')
count(r => r.dataverse_id ? 'migrated (has dataverse_id)' : 'portal-native (no dataverse_id)')
  .forEach(([k, n]) => console.log(`  ${k}: ${n}`))

console.log('\nBy year-month (top 15):')
count(r => (r.created_at ?? '').slice(0, 7)).slice(0, 15).forEach(([k, n]) => console.log(`  ${k}: ${n}`))

console.log('\nBy company (top 15):')
count(r => r.companies?.name ?? 'NO COMPANY').slice(0, 15).forEach(([k, n]) => console.log(`  ${k}: ${n}`))

console.log('\nBy status:')
count(r => r.status ?? 'NULL').forEach(([k, n]) => console.log(`  ${k}: ${n}`))

console.log('\nRecent 10 (created_at desc):')
rows.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
rows.slice(0, 10).forEach(r =>
  console.log(`  ${r.created_at?.slice(0, 10)}  ${r.status}  dv=${r.dataverse_id ? 'y' : 'n'}  note=${r.import_note ?? '-'}  ${r.companies?.name ?? '-'}`))
