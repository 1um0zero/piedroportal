/**
 * One-off: orders submitted 2026-07-13 whose created_at still carried the draft
 * creation date (drafts saved days earlier). The order date is the submission
 * date — set created_at := updated_at (the submit moment) for the listed ids.
 * Going forward updateDraftAction stamps created_at at submission.
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

const IDS = [
  'c24060d2-d17b-496b-a2f7-c7379f742fa4', // #4979
  '1e6cc1de-9cbb-4512-aae5-078df53d6142', // #4978
  '7b4666e4-4200-43ad-849e-e8cd6f3fe09a', // #4977
  '76de0dec-6d52-4bbe-8a5c-82d9ab367208', // #4976
  '577bea72-eb31-4f4f-9259-d10ede5ca3a9', // #4975
  'e2688019-32d4-4ad3-b28c-9101d23b335a', // #4974
  'a0ab29b9-e847-4774-b14b-1aaa41814deb', // #4973
  'f608632d-ed8c-4523-86c2-b5f9d71750a9', // #4972
  '426bed6f-52b9-4064-9f47-502d4b3ebb40', // #4971
  '86dfa80d-37f5-4746-83d4-5805325b0d40', // #4963
]

for (const id of IDS) {
  const { data: o, error } = await sb.from('orders')
    .select('id, order_seq, status, created_at, updated_at').eq('id', id).single()
  if (error || !o) { console.error(id, 'fetch failed:', error?.message); continue }
  if (o.status !== 'submitted') { console.log(`#${o.order_seq} skipped (status=${o.status})`); continue }
  const { error: upErr } = await sb.from('orders')
    .update({ created_at: o.updated_at }).eq('id', id)
  console.log(`#${o.order_seq}  ${o.created_at} -> ${o.updated_at}  ${upErr ? 'ERROR: ' + upErr.message : 'OK'}`)
}
