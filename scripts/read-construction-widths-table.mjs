/**
 * Read-only: load the authoritative cr56f_StyleConstructionWidthLists table
 * (style → construction-group → widths), map it to style names, and cross-check
 * against the DB products for orphans both ways.
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const API = env.DATAVERSE_URL + '/api/data/v9.2'
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function token() {
  const r = await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: env.DATAVERSE_CLIENT_ID, client_secret: env.DATAVERSE_CLIENT_SECRET, scope: env.DATAVERSE_URL + '/.default' }),
  })
  const d = await r.json(); if (!d.access_token) throw new Error(JSON.stringify(d)); return d.access_token
}
async function fetchAll(path, t) {
  const headers = { Authorization: 'Bearer ' + t, Accept: 'application/json', Prefer: 'odata.maxpagesize=2000' }
  let url = API + path, out = []
  while (url) { const r = await fetch(url, { headers }); if (!r.ok) throw new Error(r.status + ' ' + await r.text()); const j = await r.json(); out.push(...(j.value ?? [])); url = j['@odata.nextLink'] ?? null; if (url) process.stdout.write('.') }
  return out
}
const splitList = s => String(s ?? '').split(/[,;]/).map(x => x.trim()).filter(Boolean)

const main = async () => {
  const t = await token()
  console.log('Loading styles + width-list table...')
  const styles = await fetchAll('/cr56f_wpp_styleses?$select=cr56f_wpp_stylesid,cr56f_name', t)
  const styleName = new Map(styles.map(s => [s.cr56f_wpp_stylesid, s.cr56f_name]))
  const rows = await fetchAll('/cr56f_styleconstructionwidthlistses?$select=_cr56f_style_value,cr56f_constructions,cr56f_widths', t)
  console.log(`\nStyles: ${styles.length} | width-list rows: ${rows.length}`)

  // style name -> Map(construction -> Set(widths)); also track AGO/fashion
  const byStyle = new Map()
  const consValues = {}
  let noStyle = 0
  for (const r of rows) {
    const name = styleName.get(r._cr56f_style_value)
    if (!name) { noStyle++; continue }
    const cons = splitList(r.cr56f_constructions)
    const widths = splitList(r.cr56f_widths)
    consValues[r.cr56f_constructions] = (consValues[r.cr56f_constructions] ?? 0) + 1
    const m = byStyle.get(name) ?? new Map()
    for (const c of cons) {
      const set = m.get(c) ?? new Set()
      widths.forEach(w => set.add(w))
      m.set(c, set)
    }
    byStyle.set(name, m)
  }
  console.log('Rows with no resolvable style:', noStyle)
  console.log('\nDistinct construction-list values in table:')
  Object.entries(consValues).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`   [${k}] ${n}`))

  // DB style names
  const dbRows = []
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('products').select('style_name').order('id').range(from, from + 999)
    if (!data.length) break; dbRows.push(...data); if (data.length < 1000) break
  }
  const dbStyles = new Set(dbRows.map(p => p.style_name))
  const tableStyles = new Set(byStyle.keys())

  const inDbNotTable = [...dbStyles].filter(s => !tableStyles.has(s)).sort()
  const inTableNotDb = [...tableStyles].filter(s => !dbStyles.has(s)).sort()

  console.log('\n=== CROSS-CHECK (by style_name) ===')
  console.log('DB styles:', dbStyles.size, '| table styles:', tableStyles.size)
  console.log('In DB but NOT in table (orphans):', inDbNotTable.length)
  console.log('   e.g.', inDbNotTable.slice(0, 25).join(', '))
  console.log('In table but NOT in DB:', inTableNotDb.length)
  console.log('   e.g.', inTableNotDb.slice(0, 25).join(', '))

  // styles whose table entry mentions AGO (the fashion problem)
  const agoStyles = [...byStyle.entries()].filter(([, m]) => m.has('AGO')).map(([s]) => s)
  console.log('\nStyles with AGO in the table:', agoStyles.length, '| e.g.', agoStyles.slice(0, 15).join(', '))

  writeFileSync('construction-widths-orphans.tsv',
    'type\tstyle_name\n' +
    inDbNotTable.map(s => `DB_only\t${s}`).join('\n') + '\n' +
    inTableNotDb.map(s => `table_only\t${s}`).join('\n'))
  console.log('\nOrphan lists written to construction-widths-orphans.tsv')
}
main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
