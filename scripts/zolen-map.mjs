/**
 * Map each Zolen group's Sole + Sole Plate values to the Dataverse-canonical config
 * values (additions-config / option-set labels), routing each picker to its underlying
 * cr56f field. Flag values with no canonical equivalent (NEW → need a Dataverse option
 * code before they can be ordered/exported).
 */
import XLSX from 'xlsx'
import { writeFileSync } from 'fs'
const wb = XLSX.readFile('docs/sole-hierarchy/Zolen Piedro.xlsx')

// Dataverse-canonical option-set labels (= additions-config values)
const CANON = {
  pu_type: ['PU Black', 'PU White', 'EVA Black', 'EVA White'],
  sole_type: ['EVA Black','EVA Taupe','EVA Grey','EVA White','EVA Lightweight Black','EVA Lightweight Taupe','Sportive Black','Sportive Beige','Sportive Grey','Sportive White','EVA Lightweight Amber','EVA Lightweight Off-White','Full Rubber Black','Full Rubber Amber','Full Rubber Blue','Full Rubber Pink','Full Rubber White','EVA Brown'],
  runner_sole: ['Piedro Runner Black','Piedro Runner Amber','Rubber Black','Rubber Amber','Fish Black','Fish Amber','Tire Black','Tire Amber','EVA Nora Astro Star Lightweight Black','EVA Nora Astro Star Lightweight Amber','EVA Lightweight Port Flex Black','EVA Lightweight Port Flex Amber','Lightweight Vibram Sole Black','Lightweight Vibram Sole Brown','Lightweight Sole Forli Uomo','Full Rubber Sole Montana Black','Full Rubber Sole Montana Brown','Nora Sole Plate Blue with Light Body Colour','Nora Sole Plate Black with Light Body Colour','Nora Sole Plate Black with Black Body Colour'],
}

// Zolen label → { field, value }  (canonical). value:null = NEW (needs Dataverse code).
const M = {
  // SOLE — bumpers (→ pu_type)
  'PU Black (Ladies)': ['pu_type', 'PU Black'], 'PU White (Ladies)': ['pu_type', 'PU White'],
  'PU Black (Men)': ['pu_type', 'PU Black'], 'PU White (Men)': ['pu_type', 'PU White'],
  'EVA Cupsole Men Black': ['pu_type', 'EVA Black'], 'EVA Cupsole Men White': ['pu_type', 'EVA White'],
  // SOLE — material (→ sole_type)
  'EVA Taupe': ['sole_type', 'EVA Taupe'], 'EVA Brown': ['sole_type', 'EVA Brown'], 'EVA Black': ['sole_type', 'EVA Black'],
  'EVA Lightweight Taupe': ['sole_type', 'EVA Lightweight Taupe'], 'EVA Lightweight Black': ['sole_type', 'EVA Lightweight Black'],
  'EVA Lightweight Off-White': ['sole_type', 'EVA Lightweight Off-White'],
  'EVA White': ['sole_type', 'EVA White'], 'PU White': ['pu_type', 'PU White'], 'PU Black': ['pu_type', 'PU Black'],
  'Full Rubber Black': ['sole_type', 'Full Rubber Black'], 'Full Rubber Amber': ['sole_type', 'Full Rubber Amber'],
  'Full Rubber Blue': ['sole_type', 'Full Rubber Blue'], 'Full Rubber Pink': ['sole_type', 'Full Rubber Pink'], 'Full Rubber White': ['sole_type', 'Full Rubber White'],
  // SOLE — vibram/montana/forli (→ runner_sole)
  'Lightweight Vibram Sole Black': ['runner_sole', 'Lightweight Vibram Sole Black'], 'Lightweight Vibram Sole Brown': ['runner_sole', 'Lightweight Vibram Sole Brown'],
  'Lightweight Sole Forli Uomo': ['runner_sole', 'Lightweight Sole Forli Uomo'],
  'Full Rubber Sole Montana Black': ['runner_sole', 'Full Rubber Sole Montana Black'], 'Full Rubber Sole Montana Brown': ['runner_sole', 'Full Rubber Sole Montana Brown'],
  // SOLE — NEW (no canonical)
  'Sneaker White': ['pu_type', null], 'Sneaker Off-White': ['pu_type', null], 'Sneaker Beige': ['pu_type', null], 'Sneaker Grey': ['pu_type', null], 'Sneaker Black': ['pu_type', null],
  'Runner soles all': ['sole_type', null],
  // PLATE (→ runner_sole)
  'Piedro TR Sole Black': ['runner_sole', 'Piedro Runner Black'], 'Piedro TR Sole Brown': ['runner_sole', 'Piedro Runner Amber'],
  'Rubber Sole Fish Black': ['runner_sole', 'Fish Black'], 'Rubber Sole Fish Amber': ['runner_sole', 'Fish Amber'],
  'EVA Nora Astro Star Lightweigth Sole Black': ['runner_sole', 'EVA Nora Astro Star Lightweight Black'],
  'EVA Nora Astro Star Lightweigth Sole Amber': ['runner_sole', 'EVA Nora Astro Star Lightweight Amber'],
  // PLATE — NEW
  'EVA Nora Astrolight Delta Black': ['runner_sole', null], 'EVA Nora Astrolight Delta Pale Brown': ['runner_sole', null],
  'EVA Nora Astrolight Delta Jeans Blue': ['runner_sole', null], 'EVA Nora Astrolight Stone Grey': ['runner_sole', null],
  'Rubber Sole Vibram': ['runner_sole', null],
  'Fish Black': ['runner_sole', 'Fish Black'], 'Fish Amber': ['runner_sole', 'Fish Amber'],
}

function parse(name) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' })
  const groups = []; let cur = null
  for (const r of rows) {
    const gn = String(r[1] || '').trim(), gc = String(r[2] || '').trim()
    const sole = String(r[3] || '').trim(), plate = String(r[4] || '').trim()
    if (gn && gn !== 'PIEDRO SOLES') { cur = { sec: name, name: gn, code: gc, sole: [], plate: [] }; groups.push(cur) }
    if (!cur) continue
    if (sole && sole !== 'Sole' && sole !== 'X') cur.sole.push(sole)
    if (plate && plate !== 'Sole Plate' && plate !== 'X') cur.plate.push(plate)
  }
  return groups
}

const lines = ['# Zolen → Dataverse-canonical mapping\n', 'Routing: Sole/Plate value → underlying cr56f field + canonical value. `NEW` = needs a Dataverse option code.\n']
const newVals = new Set()
for (const sheet of ['KIDS', 'ADULTS']) {
  lines.push(`\n## ${sheet}`)
  for (const g of parse(sheet)) {
    lines.push(`\n### [${g.code || '—'}] ${g.name}`)
    for (const axis of ['sole', 'plate']) {
      if (!g[axis].length) continue
      lines.push(`- **${axis === 'sole' ? 'Sole' : 'Sole Plate'}:**`)
      for (const v of g[axis]) {
        const m = M[v]
        if (!m) { lines.push(`    - \`${v}\` → ❓ UNMAPPED`); newVals.add(v); continue }
        const [field, canon] = m
        if (canon == null) { lines.push(`    - \`${v}\` → **${field}** : 🆕 NEW`); newVals.add(`${v}  (→ ${field})`) }
        else lines.push(`    - \`${v}\` → ${field} : \`${canon}\``)
      }
    }
  }
}
lines.push('\n\n## 🆕 NEW values needing a Dataverse option code (Piedro/A-Shell action)')
;[...newVals].sort().forEach(v => lines.push(`- ${v}`))
writeFileSync('docs/sole-hierarchy/zolen-canonical-map.md', lines.join('\n') + '\n')
console.log('Written docs/sole-hierarchy/zolen-canonical-map.md')
console.log('NEW/unmapped values:', newVals.size)
;[...newVals].sort().forEach(v => console.log('  •', v))
