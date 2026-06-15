/**
 * Repair colour names truncated to exactly 30 characters at the source.
 *
 * Root cause: Dataverse's cr56f_color_name is itself capped at 30 chars for ~195
 * style_colors (the B-prefix ZSM/fashion styles + a few adult 3xxx/5xxx). The XLS
 * workbook ("All models…") holds the full name for some adult rows but does NOT
 * contain the B-prefix styles at all. So:
 *
 *   1. If the workbook has a longer name for the colour_id → use it (authoritative).
 *   2. Otherwise the cut always lands inside the trailing material/finish word
 *      ("…Suede Nub", "…Leather Sued", "…Suede Mes"). Complete that final fragment
 *      to its unique dictionary word. This is a reconstruction of the *visible*
 *      partial token only — it does not invent words beyond the cut.
 *
 * This only repairs the English base color_name. Re-run translate-colour-names.mjs
 * afterwards to rebuild color_name_i18n {nl,fr,de} from the corrected base.
 *
 * Run:  node scripts/fix-truncated-colour-names.mjs           (dry-run)
 *       node scripts/fix-truncated-colour-names.mjs --apply
 */
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// ── workbook lookup: `${style}.${suffix}` → full color_name ──────────────────
const pad = s => { s = String(s).trim(); return /^\d+$/.test(s) && s.length < 4 ? s.padStart(4, '0') : s }
// ZSM workbook first (richer: has the ZSM/B-prefix sheet + longer names), then the base one.
const WORKBOOKS = [
  'docs/All models for the Platform_last version_ZSM.xls',
  'docs/All models for the Platform_last version.xlsx',
]
const xls = {}
for (const file of WORKBOOKS) {
  const wb = XLSX.read(readFileSync(file))
  for (const sn of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: null })
    if (!rows.length) continue
    const nameK = Object.keys(rows[0]).find(k => /^cr56f_name$/i.test(k))
    const idK   = Object.keys(rows[0]).find(k => /stylecolorid/i.test(k))
    const cnK   = Object.keys(rows[0]).find(k => /color_name/i.test(k))
    if (!nameK || !idK || !cnK) continue
    for (const r of rows) {
      const key = String(r[nameK] ?? '').trim() + '.' + pad(r[idK])
      const nm = String(r[cnK] ?? '').trim()
      // keep the longest variant seen across workbooks/sheets
      if (nm && (!xls[key] || nm.length > xls[key].length)) xls[key] = nm
    }
  }
}

// ── trailing-fragment → full word (unambiguous prefixes of one material word) ──
const FRAG = {
  Leathe:'Leather', Leath:'Leather', Leat:'Leather', Lea:'Leather', Le:'Leather', L:'Leather',
  Sued:'Suede', Sue:'Suede', Su:'Suede', S:'Suede',
  Nubuc:'Nubuck', Nubu:'Nubuck', Nub:'Nubuck',
  Mes:'Mesh', M:'Mesh',
  Fantas:'Fantasy', Fanta:'Fantasy', Fant:'Fantasy', Fan:'Fantasy',
  Stret:'Stretch', Stre:'Stretch',
  Pate:'Patent', Pat:'Patent',
}
const fragRe = new RegExp('(?:^|\\s)(' + Object.keys(FRAG).sort((a,b)=>b.length-a.length).join('|') + ')$')
const SINGLE = new Set(['L','M','S']) // single-letter completions are best-guess

const main = async () => {
  let all = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('products').select('id,colour_id,section,color_name').not('color_name','is',null).range(from, from + 999)
    if (!data?.length) break; all = all.concat(data); if (data.length < 1000) break
  }
  const trunc = all.filter(p => p.color_name.length === 30 && fragRe.test(p.color_name))

  const fromXls = [], reconstructed = [], guessed = [], unresolved = []
  for (const p of trunc) {
    const x = xls[p.colour_id]
    if (x && x.length > p.color_name.length) { fromXls.push({ ...p, fixed: x }); continue }
    const m = p.color_name.match(fragRe)
    const frag = m[1], word = FRAG[frag]
    if (!word) { unresolved.push(p); continue }
    const fixed = p.color_name.slice(0, m.index + (m[0].length - frag.length)) + word
    ;(SINGLE.has(frag) ? guessed : reconstructed).push({ ...p, frag, fixed })
  }

  const show = (arr, label) => {
    console.log(`\n${label}: ${arr.length}`)
    for (const r of arr) console.log(`  ${r.colour_id.padEnd(12)} ${JSON.stringify(r.color_name)} -> ${JSON.stringify(r.fixed)}`)
  }
  console.log(`Truncated rows: ${trunc.length}`)
  show(fromXls, 'A) From workbook (authoritative)')
  show(reconstructed, 'B) Completed trailing word (multi-char fragment, high confidence)')
  show(guessed, 'C) Single-letter completion (best guess — review)')
  if (unresolved.length) show(unresolved.map(p=>({...p,fixed:'?'})), 'D) UNRESOLVED — no source, ambiguous')

  if (!APPLY) { console.log('\n(dry-run — pass --apply to write)'); return }
  const updates = [...fromXls, ...reconstructed, ...guessed]
  let done = 0
  for (const u of updates) {
    const { error } = await sb.from('products').update({ color_name: u.fixed }).eq('id', u.id)
    if (error) console.log('ERR', u.colour_id, error.message); else done++
  }
  console.log(`\n✅ fixed ${done} color_name base values. Now re-run translate-colour-names.mjs --apply to rebuild i18n.`)
}
main().catch(e => { console.error('❌', e); process.exit(1) })
