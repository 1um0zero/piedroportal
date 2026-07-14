import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]))
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { count: exported } = await s.from('orders').select('id',{count:'exact',head:true}).not('erp_exported_at','is',null)
const { count: inprod } = await s.from('orders').select('id',{count:'exact',head:true}).in('status',['in_production','delivered'])
console.log('exported total:', exported, '| in_production+delivered total:', inprod)
