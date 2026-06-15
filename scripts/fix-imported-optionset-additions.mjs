/**
 * Fix imported (Dataverse) orders whose option-set additions were stored as raw
 * numeric codes (e.g. 979580004) instead of their human label ("5").
 *
 * Root cause: import-dataverse-orders.mjs mapped these choice fields with sided()
 * (raw value) instead of optSided() (FormattedValue label). See additions-config.ts
 * — every field below is type 'mm' but is a Dataverse choice column.
 *
 * Only orders with a dataverse_id are touched, and only values that are an actual
 * option-set code (>= 979580000) are rewritten — portal-created values are numbers
 * like 5/8/10 and are left untouched. Idempotent.
 *
 * Usage: node scripts/fix-imported-optionset-additions.mjs [--apply]
 *        (default is a dry-run; pass --apply to write)
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb    = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const APPLY = process.argv.includes('--apply')

// addition field key  ->  Dataverse choice field (lf variant; rf has identical codes)
const FIELD_TO_DV = {
  lat_joint_w: 'cr56f_lateraljointwidthlf',
  med_joint_w: 'cr56f_medialjointwidthlf',
  lat_heel_w:  'cr56f_lateralheelwidthlf',
  med_heel_w:  'cr56f_medialheelwidthlf',
  hammer_toe:  'cr56f_2hammertoelf',
  toe_box:     'cr56f_2toeboxlf',
  bunionette:  'cr56f_2bunionettelf',
  hallux_v:    'cr56f_2halluxvalguslf',
  depth_fore:  'cr56f_2depthtoforepartlf',
  depth_toe:   'cr56f_2depthtotoeheellf',
  xw_cone:     'cr56f_2extrawidthonconelf',
  str_heel:    'cr56f_2straightenheelcliplf',
  heel_depth:  'cr56f_2heeldepthonlylf',
  haglund:     'cr56f_2haglundheelexostosislf',
  pad_tongue:  'cr56f_extrapaddingontonguelf',
  sf_medial:   'cr56f_3sf_mediallf',
  sf_lateral:  'cr56f_3sf_laterallf',
  hf_medial:   'cr56f_3hf_mediallf',
  hf_lateral:  'cr56f_3hf_laterallf',
  sw_medial:   'cr56f_4sw_mediallf',
  sw_lateral:  'cr56f_4sw_laterallf',
  hw_medial:   'cr56f_4hw_mediallf',
  hw_lateral:  'cr56f_4hw_laterallf',
}

// Build code -> label map per addition key from the option-set dump.
const dump = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/dataverse-option-sets.json'), 'utf8'))
const CODE_TO_LABEL = {}
for (const [key, dvField] of Object.entries(FIELD_TO_DV)) {
  const f = dump.fields[dvField]
  if (!f) { console.warn(`⚠ no option set for ${dvField} (${key})`); continue }
  const m = new Map()
  for (const o of f.options) m.set(o.value, o.label === '--' ? null : o.label)
  CODE_TO_LABEL[key] = m
}

const isCode = (v) => {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : NaN)
  return Number.isFinite(n) && n >= 979580000
}
const decode = (key, v) => {
  const n = typeof v === 'number' ? v : Number(v)
  const m = CODE_TO_LABEL[key]
  return m && m.has(n) ? m.get(n) : v // unknown code: leave as-is rather than lose data
}

// ── Fetch all imported orders (paged) ──────────────────────────────────────────
const PAGE = 1000
let from = 0, all = []
for (;;) {
  const { data, error } = await sb
    .from('orders')
    .select('id, additions')
    .not('dataverse_id', 'is', null)
    .range(from, from + PAGE - 1)
  if (error) { console.error(error); process.exit(1) }
  all = all.concat(data)
  if (data.length < PAGE) break
  from += PAGE
}
console.log(`Imported orders fetched: ${all.length}`)

let changed = 0
const perField = {}
for (const order of all) {
  const add = order.additions
  if (!add || typeof add !== 'object') continue
  let dirty = false
  const next = { ...add }
  for (const key of Object.keys(FIELD_TO_DV)) {
    const val = add[key]
    if (!val || typeof val !== 'object') continue // sided {l,r}
    const nv = { ...val }
    for (const side of ['l', 'r']) {
      if (isCode(nv[side])) {
        const dec = decode(key, nv[side])
        if (dec !== nv[side]) {
          nv[side] = dec
          dirty = true
          perField[key] = (perField[key] || 0) + 1
        }
      }
    }
    if (dirty) next[key] = nv
  }
  if (!dirty) continue
  changed++
  if (changed <= 5) {
    console.log(`\n  e.g. order ${order.id}`)
    for (const k of Object.keys(FIELD_TO_DV)) {
      if (JSON.stringify(add[k]) !== JSON.stringify(next[k]))
        console.log(`    ${k}: ${JSON.stringify(add[k])} -> ${JSON.stringify(next[k])}`)
    }
  }
  if (APPLY) {
    const { error } = await sb.from('orders').update({ additions: next }).eq('id', order.id)
    if (error) { console.error(`update ${order.id}:`, error.message); process.exit(1) }
  }
}

console.log(`\nOrders ${APPLY ? 'updated' : 'that WOULD be updated'}: ${changed}`)
console.log('Values rewritten per field:', perField)
if (!APPLY) console.log('\n(dry-run — re-run with --apply to write)')
