/**
 * One-shot data correction: dispatched orders frozen as in_production.
 *
 * Background: the ERP pushed carrier tracking at dispatch but never a
 * 'delivered' production_state afterwards (the Dataverse import is one-shot),
 * so ~850 shipped orders stayed status='in_production' with their tracking
 * hidden. The /status route now promotes tracked orders out of production, but
 * the historical rows need a backfill:
 *   - tracking present + expected_dispatch_date > 90 days in the past
 *       -> 'delivered'  (safe: overdue by months, authorised by Jorge)
 *   - tracking present, everything else
 *       -> 'shipped'    (dispatched, not confirmed delivered; VSI confirms later)
 * Untracked in_production orders are left untouched (genuine current production).
 *
 * Usage:  node scripts/backfill-shipped-delivered.mjs [--apply]
 * Without --apply it's a dry run (prints the plan, writes nothing).
 */
import { readFileSync } from 'fs'; import { resolve } from 'path'; import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync(resolve(process.cwd(),'.env.local'),'utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const APPLY = process.argv.includes('--apply')
const NOW = new Date('2026-07-01')
const NINETY = 90*864e5

let from=0, ip=[]
for(;;){ const {data,error}=await sb.from('orders').select('id, order_seq, tracking_link, tracking_code, expected_dispatch_date').eq('status','in_production').range(from,from+999)
  if(error){console.error(error.message);process.exit(1)} if(!data||!data.length)break; ip=ip.concat(data); if(data.length<1000)break; from+=1000 }

const tracked = ip.filter(o=>o.tracking_link||o.tracking_code)
const toDelivered = tracked.filter(o=>o.expected_dispatch_date && (NOW-new Date(o.expected_dispatch_date))>NINETY)
const dset = new Set(toDelivered.map(o=>o.id))
const toShipped = tracked.filter(o=>!dset.has(o.id))

console.log(`in_production total: ${ip.length}`)
console.log(`  untouched (no tracking, genuine production): ${ip.length-tracked.length}`)
console.log(`  -> delivered (tracked, >90d overdue): ${toDelivered.length}`)
console.log(`  -> shipped   (tracked, rest):          ${toShipped.length}`)

if(!APPLY){ console.log('\nDRY RUN — re-run with --apply to write.'); process.exit(0) }

async function bulkUpdate(ids, status){
  let done=0
  for(let i=0;i<ids.length;i+=200){
    const batch=ids.slice(i,i+200)
    const {error}=await sb.from('orders').update({status}).in('id',batch)
    if(error){console.error(status,error.message);process.exit(1)}
    done+=batch.length; process.stdout.write(`\r  ${status}: ${done}/${ids.length}`)
  }
  console.log('')
}
await bulkUpdate(toDelivered.map(o=>o.id),'delivered')
await bulkUpdate(toShipped.map(o=>o.id),'shipped')
console.log('Done.')
