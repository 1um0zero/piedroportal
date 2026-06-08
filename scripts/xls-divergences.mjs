/**
 * Read-only: full divergence report between the XLS and the CURRENT db.
 * A divergence = the XLS has a NON-EMPTY value for a column that differs from the
 * DB (empty XLS cells are "no opinion", never a divergence — rule 3). Widths are
 * compared in base notation (N,R,W normalised to S,M,L).
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const BASE = { N: 'S', R: 'M', W: 'L' }
const GENDER = { KIDS: 'KIDS', MAN: 'MEN', MEN: 'MEN', WOMAN: 'WOMEN', WOMEN: 'WOMEN' }
const FRACS = { '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75 }
const str = v => { if (v == null) return ''; return String(v).trim() }
const parseSize = v => { const s = str(v).replace(',', '.'); const m = s.match(/^(\d+)\s*([½⅓⅔¼¾])/); if (m) return parseInt(m[1], 10) + (FRACS[m[2]] ?? 0); const n = parseFloat(s); return isNaN(n) ? null : n }
const splitW = s => [...new Set(str(s).split(/[,;]/).map(x => x.trim()).filter(Boolean).map(w => BASE[w] ?? w))]
const splitC = s => str(s).split(/[,;]/).map(x => x.trim()).filter(Boolean)
const colourCode = v => { const s = str(v); return /^\d+$/.test(s) ? s.padStart(4, '0') : s }
const consKey = cs => JSON.stringify([...(cs ?? [])].map(c => ({ c: c.construction, w: [...(c.widths ?? [])].sort() })).sort((a, b) => a.c.localeCompare(b.c)))
const consStr = cs => (cs ?? []).map(c => `${c.construction}:[${(c.widths ?? []).join(',')}]`).join(' ')

function parseXls() {
  const wb = XLSX.read(readFileSync('docs/All models for the Platform_last version.xls'), { type: 'buffer' })
  console.log('Sheets in workbook:', wb.SheetNames.join(', '))
  const active = wb.SheetNames.filter(n => ['KIDS', 'ADULTS', 'FASHION'].includes(n.trim().toUpperCase()))
  console.log('Treated as active:', active.join(', ') || '(none)')
  const map = new Map()
  for (const sheet of active) {
    for (const r of XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' })) {
      const name = str(r['cr56f_name']); if (!name) continue
      const code = colourCode(r['cr56f_stylecolorid'])
      const id = code ? `${name}.${code}` : str(r['Picture Name']); if (!id) continue
      const m = map.get(id) ?? { row: r, cons: new Map() }
      for (const c of splitC(r['cr56f_constructionlist'])) {
        const set = m.cons.get(c) ?? new Set(); splitW(r['cr56f_widthlist']).forEach(w => set.add(w)); m.cons.set(c, set)
      }
      map.set(id, m)
    }
  }
  return map
}

const main = async () => {
  const xls = parseXls()
  const db = []
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('products').select('colour_id,section,closure,type,color_basic,color_name,size_first,size_last,diabetics,info,constructions').order('id').range(from, from + 999)
    if (!data.length) break; db.push(...data); if (data.length < 1000) break
  }
  const dbMap = new Map(db.map(p => [p.colour_id, p]))

  const fieldDiffs = {}        // field -> count
  const rows = []              // detailed rows
  let newCount = 0
  for (const [id, x] of xls) {
    const ex = dbMap.get(id)
    if (!ex) { newCount++; continue }
    const r = x.row
    const checks = [
      ['section', GENDER[str(r['cr56f_gender']).toUpperCase()] ?? '', ex.section],
      ['closure', str(r['cr56f_closure']).toUpperCase(), ex.closure],
      ['type', str(r['cr56f_type']), ex.type],
      ['color_basic', str(r['cr56f_colorbasic']), ex.color_basic],
      ['color_name', str(r['cr56f_color_name']), ex.color_name],
      ['size_first', parseSize(r['cr56f_sizefirst']), ex.size_first],
      ['size_last', parseSize(r['cr56f_sizelast']), ex.size_last],
      ['info', str(r['cr56f_info']), ex.info],
    ]
    const diffs = []
    for (const [f, xv, dv] of checks) {
      if (xv === '' || xv == null) continue              // empty XLS cell = no opinion
      if (String(xv) !== String(dv ?? '')) diffs.push(`${f}: XLS[${xv}] DB[${dv ?? ''}]`)
    }
    // constructions (only if XLS has any)
    const xCons = [...x.cons.entries()].map(([c, w]) => ({ construction: c, widths: [...w] }))
    if (xCons.length && consKey(xCons) !== consKey(ex.constructions)) {
      diffs.push(`constructions: XLS[${consStr(xCons)}] DB[${consStr(ex.constructions)}]`)
    }
    if (diffs.length) {
      diffs.forEach(d => { const f = d.split(':')[0]; fieldDiffs[f] = (fieldDiffs[f] ?? 0) + 1 })
      rows.push({ id, diffs })
    }
  }

  console.log(`\nXLS models: ${xls.size} | new (not in DB): ${newCount} | existing with divergences: ${rows.length}\n`)
  console.log('Divergences by column:')
  Object.entries(fieldDiffs).sort((a, b) => b[1] - a[1]).forEach(([f, n]) => console.log(`   ${f.padEnd(14)} ${n}`))

  console.log('\nFirst 25 divergent models:')
  rows.slice(0, 25).forEach(r => console.log(`  ${r.id}\n     ${r.diffs.join('\n     ')}`))

  writeFileSync('xls-divergences.tsv',
    'colour_id\tdivergences\n' + rows.map(r => `${r.id}\t${r.diffs.join(' | ')}`).join('\n'))
  console.log(`\nFull list (${rows.length}) written to xls-divergences.tsv`)
}
main().catch(e => { console.error('❌', e.message); process.exit(1) })
