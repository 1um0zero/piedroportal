/**
 * Mint a direct set-password link for a user (bypasses email delivery).
 * Same token mechanics as src/lib/password-reset.ts: random 32-byte secret,
 * only SHA-256 hash stored, single-use, 2h TTL.
 *
 * Usage: node scripts/mint-setpassword-link.mjs <email> [email2 ...]
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { randomBytes, createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const SITE = env.NEXT_PUBLIC_SITE_URL || 'https://portal.piedro.pt'
const TTL = 2 * 60 * 60 * 1000
const sha256 = s => createHash('sha256').update(s).digest('hex')

const emails = process.argv.slice(2)
if (!emails.length) { console.error('Usage: node scripts/mint-setpassword-link.mjs <email> [email2 ...]'); process.exit(1) }

for (const email of emails) {
  const clean = email.trim().toLowerCase()
  const { data: p } = await sb.from('profiles')
    .select('id, email, preferred_locale').ilike('email', clean).limit(1).maybeSingle()
  if (!p?.id) { console.log(`❌ ${clean}: no profile`); continue }

  const raw = randomBytes(32).toString('base64url')
  const { error } = await sb.from('password_reset_tokens').insert({
    token_hash: sha256(raw), user_id: p.id,
    expires_at: new Date(Date.now() + TTL).toISOString(),
  })
  if (error) { console.log(`❌ ${clean}: ${error.message}`); continue }

  const loc = ['nl', 'fr', 'de'].includes(p.preferred_locale) ? p.preferred_locale : ''
  const prefix = loc ? `/${loc}` : ''
  console.log(`\n✅ ${p.email}`)
  console.log(`${SITE}${prefix}/set-password?token=${encodeURIComponent(raw)}`)
}
console.log('\n(válidos 2 horas, uso único)')
