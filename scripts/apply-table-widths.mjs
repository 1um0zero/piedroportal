/**
 * Rebuild products.constructions from the authoritative
 * cr56f_StyleConstructionWidthLists table (style → construction → widths).
 *
 * - Non-fashion styles: take constructions/widths verbatim from the table.
 * - Fashion styles (table lists them wrongly as "AGO"): apply the recipe given
 *   by Jorge — Rehabilitation + Stability, widths = E,F,G,H,I,J,K,M (the union
 *   of the two width versions F,H,J,K,M and E,G,I,K,M). Only with --fashion.
 *
 * Usage:
 *   node scripts/apply-table-widths.mjs            # dry run (non-fashion)
 *   node scripts/apply-table-widths.mjs --apply    # write non-fashion
 *   node scripts/apply-table-widths.mjs --apply --fashion   # also write fashion
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const FASHION = process.argv.includes('--fashion')
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const API = env.DATAVERSE_URL + '/api/data/v9.2'
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Fashion styles are wrong in every Dataverse source (AGO, no/incorrect widths).
// Correct mapping supplied by Jorge (attachment): each style → one width list,
// unfolded into Rehabilitation + Stability. Split by the middle code:
//   04571/04621/04324 → F,H,J,K,M   ·   03619/03620 → E,G,I,K,M
const FHJKM = ['F', 'H', 'J', 'K', 'M']
const EGIKM = ['E', 'G', 'I', 'K', 'M']
const FASHION_MAP = {
  '712.04571.74': FHJKM, '712.04571.54': FHJKM, '717.04571.74': FHJKM, '717.04571.54': FHJKM,
  '711.04621.74': FHJKM, '711.04621.54': FHJKM, '717.04621.74': FHJKM, '717.04621.54': FHJKM,
  '712.04324.74': FHJKM,
  '711.03620.74': EGIKM, '711.03620.54': EGIKM, '717.03620.74': EGIKM, '717.03620.54': EGIKM,
  '712.03619.74': EGIKM, '712.03619.54': EGIKM, '717.03619.74': EGIKM, '717.03619.54': EGIKM,
}
// Base notation: N,R,W is the NL display of S,M,L — store the base.
const BASE = { N: 'S', R: 'M', W: 'L' }
const splitList = s => [...new Set(String(s ?? '').split(/[,;]/).map(x => x.trim()).filter(Boolean).map(w => BASE[w] ?? w))]
const eq = (a, b) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort())

async function token() {
  const r = await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET, scope: env.DATAVERSE_URL + '/.default' }),
  })
  return (await r.json()).access_token
}
async function fetchAll(path, t) {
  const headers = { Authorization: 'Bearer ' + t, Accept: 'application/json', Prefer: 'odata.maxpagesize=2000' }
  let url = API + path, out = []
  while (url) { const r = await fetch(url, { headers }); if (!r.ok) throw new Error(r.status + ' ' + await r.text()); const j = await r.json(); out.push(...(j.value ?? [])); url = j['@odata.nextLink'] ?? null }
  return out
}

const main = async () => {
  console.log(APPLY ? `🚀 APPLY${FASHION ? ' (+fashion)' : ''}\n` : '🔍 DRY RUN\n')
  const t = await token()
  const styles = await fetchAll('/cr56f_wpp_styleses?$select=cr56f_wpp_stylesid,cr56f_name', t)
  const styleName = new Map(styles.map(s => [s.cr56f_wpp_stylesid, s.cr56f_name]))
  const tableRows = await fetchAll('/cr56f_styleconstructionwidthlistses?$select=_cr56f_style_value,cr56f_constructions,cr56f_widths', t)

  const byStyle = new Map()      // name -> Map(construction -> Set(widths))
  const isFashion = new Set()    // style names whose table entry is AGO
  for (const r of tableRows) {
    const name = styleName.get(r._cr56f_style_value); if (!name) continue
    const cons = splitList(r.cr56f_constructions), widths = splitList(r.cr56f_widths)
    if (cons.includes('AGO')) isFashion.add(name)
    const m = byStyle.get(name) ?? new Map()
    for (const c of cons) { const set = m.get(c) ?? new Set(); widths.forEach(w => set.add(w)); m.set(c, set) }
    byStyle.set(name, m)
  }

  // Report: width sets per construction across the table (non-fashion).
  const perCon = {}
  for (const [name, m] of byStyle) {
    if (isFashion.has(name)) continue
    for (const [c, w] of m) { const k = [...w].join(','); (perCon[c] ??= {})[k] = (perCon[c][k] ?? 0) + 1 }
  }
  console.log('Width sets per construction in the table:')
  for (const [c, sets] of Object.entries(perCon)) {
    console.log(`  ${c}:`)
    Object.entries(sets).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`      ${String(n).padStart(4)}x [${k}]`))
  }

  // Build desired constructions per style.
  const desiredFor = (name) => {
    const fw = FASHION_MAP[name]
    if (fw) {
      return [
        { construction: 'Rehabilitation', widths: [...fw] },
        { construction: 'Stability', widths: [...fw] },
      ]
    }
    return [...(byStyle.get(name) ?? new Map()).entries()].map(([c, w]) => ({ construction: c, widths: [...w] }))
  }

  const dbRows = []
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('products').select('id,style_name,constructions').order('id').range(from, from + 999)
    if (!data.length) break; dbRows.push(...data); if (data.length < 1000) break
  }

  const updates = [], fashionUpdates = []
  for (const p of dbRows) {
    const want = desiredFor(p.style_name)
    if (!want.length) continue
    const cur = p.constructions ?? []
    const same = want.length === cur.length &&
      want.every(wc => { const cc = cur.find(c => c.construction === wc.construction); return cc && eq(cc.widths, wc.widths) })
    if (same) continue
    const row = { id: p.id, constructions: want }
    if (FASHION_MAP[p.style_name]) fashionUpdates.push(row); else updates.push(row)
  }

  console.log(`\nNon-fashion models to update: ${updates.length}`)
  console.log(`Fashion models to update:     ${fashionUpdates.length}  (Rehab+Stability, per-style F,H,J,K,M or E,G,I,K,M)`)

  if (!APPLY) { console.log('\n[dry-run] no writes'); return }

  const write = async (rows, label) => {
    for (let i = 0; i < rows.length; i += 25) {
      const res = await Promise.all(rows.slice(i, i + 25).map(u =>
        supabase.from('products').update({ constructions: u.constructions }).eq('id', u.id)))
      const err = res.find(r => r.error); if (err) { console.error('❌', err.error.message); process.exit(1) }
      process.stdout.write(`\r  ${label}: ${Math.min(i + 25, rows.length)}/${rows.length}`)
    }
    if (rows.length) console.log()
  }
  await write(updates, 'non-fashion')
  if (FASHION) await write(fashionUpdates, 'fashion')
  else console.log(`  (fashion held — re-run with --fashion to write the ${fashionUpdates.length})`)
  console.log('✅ done')
}
main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
