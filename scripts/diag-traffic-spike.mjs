/**
 * Diagnose the 2026-07-14 Vercel gallery traffic spike from portal.piedro.pt.
 * Correlates it with three plausible triggers:
 *   1) an email campaign sent around noon,
 *   2) an announcement whose display window opened today,
 *   3) a burst of orders created today (users landing on gallery to order).
 * Read-only. Usage: node scripts/diag-traffic-spike.mjs
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

const dayStart = '2026-07-14T00:00:00Z'
const dayEnd   = '2026-07-15T00:00:00Z'

console.log('\n================ EMAIL CAMPAIGNS (created or scheduled today) ================')
{
  const { data, error } = await sb.from('email_campaigns')
    .select('id, subject, status, audience, scheduled_at, started_at, sent_count, failed_count, created_at')
    .or(`created_at.gte.${dayStart},scheduled_at.gte.${dayStart}`)
    .order('created_at', { ascending: false }).limit(20)
  if (error) console.error('  err:', error.message)
  else if (!data.length) console.log('  (none)')
  else for (const c of data) console.log(
    `  [${c.status}] "${c.subject}"  aud=${c.audience}  sent=${c.sent_count}/fail=${c.failed_count}` +
    `\n     created=${c.created_at}  scheduled=${c.scheduled_at}  started=${c.started_at}`)
}

console.log('\n================ ANNOUNCEMENTS active with a window touching today ================')
{
  const { data, error } = await sb.from('announcements')
    .select('id, title, display_type, placement, active, starts_at, ends_at, created_at')
    .order('created_at', { ascending: false }).limit(30)
  if (error) console.error('  err:', error.message)
  else {
    const live = data.filter(a => a.active &&
      (!a.starts_at || a.starts_at <= dayEnd) && (!a.ends_at || a.ends_at >= dayStart))
    if (!live.length) console.log('  (none active in window)')
    else for (const a of live) console.log(
      `  [${a.display_type}] "${a.title}"  placement=${JSON.stringify(a.placement)}` +
      `\n     starts=${a.starts_at}  ends=${a.ends_at}  created=${a.created_at}`)
  }
}

console.log('\n================ ORDERS created today (hourly histogram, UTC) ================')
{
  const { data, error } = await sb.from('orders')
    .select('created_at, status')
    .gte('created_at', dayStart).lt('created_at', dayEnd)
    .order('created_at', { ascending: true }).limit(2000)
  if (error) console.error('  err:', error.message)
  else {
    console.log(`  total orders created today: ${data.length}`)
    const byHour = {}
    for (const o of data) {
      const h = o.created_at.slice(11, 13)
      byHour[h] = (byHour[h] || 0) + 1
    }
    for (const h of Object.keys(byHour).sort())
      console.log(`   ${h}:00 UTC  ${'█'.repeat(byHour[h])} ${byHour[h]}`)
  }
}

console.log('')
