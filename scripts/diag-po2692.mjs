import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]))
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await s.from('orders')
  .select('id, order_seq, reference_customer, piedro_order_id, status, production_state, erp_order_ref, erp_exported_at, unit, created_at')
  .ilike('reference_customer','%2692%')
if (error) console.error('ERR', error.message)
else console.log(JSON.stringify(data, null, 2))
