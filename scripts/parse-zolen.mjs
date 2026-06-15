import XLSX from 'xlsx'
const wb = XLSX.readFile('docs/sole-hierarchy/Zolen Piedro.xlsx')

// additions-config current option values
const cfg = {
  pu_type: ['PU Black','PU White','EVA Black','EVA White'],
  sole_type: ['EVA Black','EVA Taupe','EVA Grey','EVA White','EVA Lightweight Black','EVA Lightweight Taupe','Sportive Black','Sportive Beige','Sportive Grey','Sportive White','EVA Lightweight Amber','EVA Lightweight Off-White','Full Rubber Black','Full Rubber Amber','Full Rubber Blue','Full Rubber Pink','Full Rubber White','EVA Brown'],
  spoiler: ['Black','Dark Brown','Light Grey','Dark Grey','Dark Blue','Red','Amber','Cobalt'],
  runner_sole: ['Piedro Runner Black','Piedro Runner Amber','Rubber Black','Rubber Amber','Fish Black','Fish Amber','Tire Black','Tire Amber','EVA Nora Astro Star Lightweight Black','EVA Nora Astro Star Lightweight Amber','EVA Lightweight Port Flex Black','EVA Lightweight Port Flex Amber','Lightweight Vibram Sole Black','Lightweight Vibram Sole Brown','Lightweight Sole Forli Uomo','Full Rubber Sole Montana Black','Full Rubber Sole Montana Brown','Nora Sole Plate Blue with Light Body Colour','Nora Sole Plate Black with Light Body Colour','Nora Sole Plate Black with Black Body Colour'],
}
const allCfg = new Set([...cfg.pu_type, ...cfg.sole_type, ...cfg.spoiler, ...cfg.runner_sole])

function parseSheet(name) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' })
  const groups = []
  let cur = null
  for (const r of rows) {
    const gname = String(r[1] || '').trim()
    const gcode = String(r[2] || '').trim()
    const sole = String(r[3] || '').trim()
    const plate = String(r[4] || '').trim()
    const art = String(r[5] || '').trim()
    if (gname && gname !== 'PIEDRO SOLES') {
      cur = { name: gname, code: gcode, sole: [], plate: [], members: [] }
      groups.push(cur)
    }
    if (!cur) continue
    if (sole && sole !== 'Sole') cur.sole.push(sole)
    if (plate && plate !== 'Sole Plate') cur.plate.push(plate)
    if (art && art !== 'Article') cur.members.push(art)
  }
  return groups
}

const soleVals = new Set(), plateVals = new Set()
for (const sheet of ['KIDS', 'ADULTS']) {
  console.log('\n################', sheet)
  for (const g of parseSheet(sheet)) {
    console.log(`\n[${g.code || '?'}] ${g.name}  — ${g.members.length} modelos`)
    console.log('   SOLE :', g.sole.join(' | ') || '(none)')
    console.log('   PLATE:', g.plate.join(' | ') || '(none)')
    console.log('   models:', g.members.join(', '))
    g.sole.forEach(v => soleVals.add(v)); g.plate.forEach(v => plateVals.add(v))
  }
}

const missing = (label, set) => {
  const miss = [...set].filter(v => !allCfg.has(v) && v !== 'X')
  console.log(`\n=== ${label}: ${miss.length} valores NÃO existem na additions-config ===`)
  miss.forEach(v => console.log('   •', v))
}
missing('SOLE values', soleVals)
missing('PLATE values', plateVals)
