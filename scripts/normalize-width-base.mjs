/**
 * Normalise width values to their BASE notation in products.constructions.
 * Confirmed by Jorge: S,M,L is the base; N,R,W is just the Dutch (NL) display of
 * the same widths (S↔N, M↔R, L↔W). The DB must store the base, so any N/R/W that
 * leaked in from the source table is mapped back to S/M/L.
 *
 * Usage: node scripts/normalize-width-base.mjs [--apply]
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// NL letter -> base letter
const MAP = { N: 'S', R: 'M', W: 'L' }
const toBase = w => MAP[w] ?? w

const main = async () => {
  console.log(APPLY ? '🚀 APPLY\n' : '🔍 DRY RUN\n')
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('products').select('id,constructions').order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    if (!data.length) break; rows.push(...data); if (data.length < 1000) break
  }

  const updates = []
  for (const p of rows) {
    let changed = false
    const next = (p.constructions ?? []).map(c => {
      const w = (c.widths ?? [])
      if (!w.some(x => MAP[x])) return c
      changed = true
      // map + dedupe (in case base value already present)
      return { construction: c.construction, widths: [...new Set(w.map(toBase))] }
    })
    if (changed) updates.push({ id: p.id, constructions: next })
  }
  console.log('Models with N/R/W to normalise:', updates.length)

  if (!APPLY) { console.log('\n[dry-run] no writes'); return }
  for (let i = 0; i < updates.length; i += 25) {
    const res = await Promise.all(updates.slice(i, i + 25).map(u =>
      supabase.from('products').update({ constructions: u.constructions }).eq('id', u.id)))
    const err = res.find(r => r.error); if (err) { console.error('❌', err.error.message); process.exit(1) }
    process.stdout.write(`\r  ${Math.min(i + 25, updates.length)}/${updates.length}`)
  }
  console.log('\n✅ done')
}
main().catch(e => { console.error('❌', e.message); process.exit(1) })
