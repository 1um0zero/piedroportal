/**
 * Generate src/components/order/sole-profile-data.ts from the Zolen master
 * (docs/sole-hierarchy/Zolen Piedro.xlsx) + the Zolen→Dataverse-canonical mapping.
 *
 * Output per group: allowed canonical values for the underlying config fields
 * (pu_type / sole_type / runner_sole). spoiler is never used by Zolen → hidden.
 * NEW/unmapped values are dropped (pending Dataverse codes). Ambiguous axes are
 * handled by explicit overrides (see OVERRIDE).
 */
import XLSX from 'xlsx'
import { writeFileSync } from 'fs'
const wb = XLSX.readFile('docs/sole-hierarchy/Zolen Piedro.xlsx')

// Zolen label → [field, canonicalValue|null]   (null = NEW, dropped)
const M = {
  'PU Black (Ladies)': ['pu_type', 'PU Black'], 'PU White (Ladies)': ['pu_type', 'PU White'],
  'PU Black (Men)': ['pu_type', 'PU Black'], 'PU White (Men)': ['pu_type', 'PU White'],
  'EVA Cupsole Men Black': ['pu_type', 'EVA Black'], 'EVA Cupsole Men White': ['pu_type', 'EVA White'],
  'EVA Taupe': ['sole_type', 'EVA Taupe'], 'EVA Brown': ['sole_type', 'EVA Brown'], 'EVA Black': ['sole_type', 'EVA Black'], 'EVA White': ['sole_type', 'EVA White'],
  'EVA Lightweight Taupe': ['sole_type', 'EVA Lightweight Taupe'], 'EVA Lightweight Black': ['sole_type', 'EVA Lightweight Black'], 'EVA Lightweight Off-White': ['sole_type', 'EVA Lightweight Off-White'],
  'Full Rubber Black': ['sole_type', 'Full Rubber Black'], 'Full Rubber Amber': ['sole_type', 'Full Rubber Amber'], 'Full Rubber Blue': ['sole_type', 'Full Rubber Blue'], 'Full Rubber Pink': ['sole_type', 'Full Rubber Pink'], 'Full Rubber White': ['sole_type', 'Full Rubber White'],
  'PU White': ['pu_type', 'PU White'], 'PU Black': ['pu_type', 'PU Black'],
  'Lightweight Vibram Sole Black': ['runner_sole', 'Lightweight Vibram Sole Black'], 'Lightweight Vibram Sole Brown': ['runner_sole', 'Lightweight Vibram Sole Brown'],
  'Lightweight Sole Forli Uomo': ['runner_sole', 'Lightweight Sole Forli Uomo'],
  'Full Rubber Sole Montana Black': ['runner_sole', 'Full Rubber Sole Montana Black'], 'Full Rubber Sole Montana Brown': ['runner_sole', 'Full Rubber Sole Montana Brown'],
  // plates
  'Piedro TR Sole Black': ['runner_sole', 'Piedro Runner Black'], 'Piedro TR Sole Brown': ['runner_sole', 'Piedro Runner Amber'],
  'Rubber Sole Fish Black': ['runner_sole', 'Fish Black'], 'Rubber Sole Fish Amber': ['runner_sole', 'Fish Amber'],
  'Fish Black': ['runner_sole', 'Fish Black'], 'Fish Amber': ['runner_sole', 'Fish Amber'],
  'EVA Nora Astro Star Lightweigth Sole Black': ['runner_sole', 'EVA Nora Astro Star Lightweight Black'],
  'EVA Nora Astro Star Lightweigth Sole Amber': ['runner_sole', 'EVA Nora Astro Star Lightweight Amber'],
  // NEW (dropped pending Dataverse codes)
  'EVA Nora Astrolight Delta Black': ['runner_sole', null], 'EVA Nora Astrolight Delta Pale Brown': ['runner_sole', null],
  'EVA Nora Astrolight Delta Jeans Blue': ['runner_sole', null], 'EVA Nora Astrolight Stone Grey': ['runner_sole', null], 'Rubber Sole Vibram': ['runner_sole', null],
  'Sneaker White': ['pu_type', null], 'Sneaker Off-White': ['pu_type', null], 'Sneaker Beige': ['pu_type', null], 'Sneaker Grey': ['pu_type', null], 'Sneaker Black': ['pu_type', null],
  'Runner soles all': ['runner_sole', null],
}

// Explicit overrides for ambiguous axes (safe fallback): omit a field's restriction entirely.
const OVERRIDE = {
  'ADULTS-3': { unrestricted: ['runner_sole'] }, // "Runner soles all" → leave runner_sole open
}

function parseAdults() {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['ADULTS'], { header: 1, blankrows: false, defval: '' })
  const groups = []; let cur = null
  for (const r of rows) {
    const gn = String(r[1] || '').trim(), gc = String(r[2] || '').trim()
    const sole = String(r[3] || '').trim(), plate = String(r[4] || '').trim(), art = String(r[5] || '').trim()
    if (gn && gn !== 'PIEDRO SOLES') { const code = (gc.match(/\d+/) || [])[0]; cur = { key: 'ADULTS-' + code, name: gn, sole: [], plate: [], members: [] }; groups.push(cur) }
    if (!cur) continue
    if (sole && !['Sole', 'X'].includes(sole)) cur.sole.push(sole)
    if (plate && !['Sole Plate', 'X'].includes(plate)) cur.plate.push(plate)
    if (art && art !== 'Article') cur.members.push(art)
  }
  return groups
}

// KIDS: explicit (parser splits the merged Cup Sole label awkwardly)
const KIDS = [
  { key: 'KIDS-NOADJ', name: 'No adjustments', sole: [], plate: [], members: ['2299','2301','2309','2212','2213','1700','1701','1702','1800'] },
  { key: 'KIDS-CUP', name: 'Cup Sole + High & Mid Tops', cupsole: true, sole: ['EVA Black','EVA White','PU White','PU Black'], plate: ['Fish Black','Fish Amber'],
    members: ['2269','2270','2272','1906','1900','1903','1901','1902','1904','1905','2160','2123','2133','2105','2115','2151','2189','2118','2137','2126'] },
  { key: 'KIDS-STITCHED', name: 'Stitched Down', sole: ['EVA Lightweight Black','EVA Lightweight Off-White','Full Rubber Black','Full Rubber Amber','Full Rubber Blue','Full Rubber Pink','Full Rubber White'], plate: [],
    members: ['2303','2312','2314','2315','2310','2316','2504','2482','2492','2488','2407','2483','2484','2480','2489','2601','2604'] },
  { key: 'KIDS-TRAINERS', name: 'Trainers', sole: [], plate: ['Fish Black','Fish Amber'], // EVA Runner base sole is model-fixed → only the Fish plate is the amendment
    members: ['2089','2034','2134','2090','2038','2138','2060','2091','2092'] },
]

const groups = [...KIDS, ...parseAdults()]
const FIELDS = ['pu_type', 'sole_type', 'runner_sole']
const PROFILE_OPTIONS = {}, PROFILE_STYLES = {}, LABELS = {}, pending = new Set()

for (const g of groups) {
  const acc = { pu_type: new Set(), sole_type: new Set(), runner_sole: new Set() }
  for (const axis of ['sole', 'plate']) for (const v of g[axis]) {
    const m = M[v]; if (!m) { pending.add(v); continue }
    let [field, canon] = m
    if (canon == null) { pending.add(v); continue }
    // Cup-sole groups: bare "EVA Black/White" is the puevabumper EVA option, not sole material.
    if (g.cupsole && (canon === 'EVA Black' || canon === 'EVA White')) field = 'pu_type'
    acc[field].add(canon)
  }
  const opt = {}
  const unr = OVERRIDE[g.key]?.unrestricted || []
  for (const f of FIELDS) {
    if (unr.includes(f)) { opt[f] = '*' }       // explicit: shown but unrestricted (sees all)
    else if (acc[f].size) opt[f] = [...acc[f]]  // restricted to these values
    // else: absent → field hidden for this group
  }
  PROFILE_OPTIONS[g.key] = opt
  PROFILE_STYLES[g.key] = g.members
  LABELS[g.key] = g.name
}

const ts = `// AUTO-GENERATED by scripts/gen-sole-profiles.mjs from "Zolen Piedro.xlsx". Do not edit by hand.
// Per-group allowed canonical values for the sole-amendment config fields.
// A field absent from a group = HIDDEN for that group. spoiler is never used by Zolen.
// Group 3 (Runner): runner_sole intentionally UNRESTRICTED ("Runner soles all", pending Anabela).
// NEW values dropped (pending Dataverse codes): see docs/sole-hierarchy/zolen-canonical-map.md.

export const SOLE_GROUP_LABELS: Record<string, string> = ${JSON.stringify(LABELS, null, 2)}

// Value '*' = field shown but UNRESTRICTED (sees all). Field absent = hidden for the group.
export const PROFILE_OPTIONS: Record<string, Partial<Record<'pu_type'|'sole_type'|'runner_sole', string[] | '*'>>> = ${JSON.stringify(PROFILE_OPTIONS, null, 2)}

export const PROFILE_STYLES: Record<string, string[]> = ${JSON.stringify(PROFILE_STYLES, null, 2)}
`
writeFileSync('src/components/order/sole-profile-data.ts', ts)
console.log('Wrote src/components/order/sole-profile-data.ts')
console.log('Groups:', groups.length, '| pending values dropped:', pending.size)
console.log('Members total:', groups.reduce((n, g) => n + g.members.length, 0))
