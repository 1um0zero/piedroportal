import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// list all files in order-pdfs (paginate)
let files = [], off = 0
for (;;) {
  const { data, error } = await sb.storage.from('order-pdfs').list('', { limit: 1000, offset: off, sortBy: { column: 'created_at', order: 'asc' } })
  if (error) { console.error(error.message); break }
  files.push(...data)
  if (data.length < 1000) break
  off += 1000
}
console.log('total pdf objects:', files.length)

const uuids = files.map(f => f.name.replace(/\.pdf$/i, ''))
// which UUIDs still have a live order row?
const alive = new Set()
for (let i = 0; i < uuids.length; i += 500) {
  const chunk = uuids.slice(i, i + 500)
  const { data } = await sb.from('orders').select('id').in('id', chunk)
  for (const o of data ?? []) alive.add(o.id)
}
const orphans = files.filter(f => !alive.has(f.name.replace(/\.pdf$/i, '')))
console.log('ORPHAN pdfs (no matching order row):', orphans.length)
for (const o of orphans) console.log('  ', o.name, '| created', o.created_at, '| size', o.metadata?.size)
