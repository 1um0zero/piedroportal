// Build a structured field map for CUSTOM orders from the Dev-env attribute dump.
// Collapses LF/RF sided pairs, maps Dataverse types -> our additions vocabulary,
// groups by the section number embedded in the display label. Output is a review
// artifact, the seed for the eventual additions-config CUSTOM entries.
import { readFileSync, writeFileSync } from 'fs'
const raw = JSON.parse(readFileSync('docs/custom-orders-dev-fields.json','utf8'))

// Map Dataverse AttributeType -> our config type
const TYPE = { Integer:'mm', Boolean:'toggle', Picklist:'option', String:'text', Lookup:'lookup', DateTime:'date' }

// Drop the Virtual *name display companions and header (§1) fields handled by the order header.
const HEADER = new Set(['clinicist','closure','customer','reference','patient','date','status','product','style','colour','order'])
const rows = raw.filter(a => a.type !== 'Virtual')

// Parse a label into { section, base, side }
function parse(label, name){
  let s = (label||'').trim()
  const secM = s.match(/^(\d+)[.\s]+/)
  const section = secM ? secM[1] : null
  if (secM) s = s.slice(secM[0].length)
  // side: trailing " LF"/" RF" or "LF"/"RF" suffix (also lf/rf on name)
  let side = 'g'
  const sm = s.match(/\s*(LF|RF)\b\s*$/i) || s.match(/(LF|RF)$/i)
  if (sm){ side = sm[1].toLowerCase()==='lf' ? 'l' : 'r'; s = s.slice(0, s.length - sm[0].length).trim() }
  else if (/lf$/i.test(name)) { side='l' } else if (/rf$/i.test(name)) { side='r' }
  const base = s.replace(/\s+/g,'_').replace(/[^\w]/g,'').toLowerCase()
  return { section, base, side }
}

const groups = {}      // section -> base -> { type, sides:Set, names:{l,r,g}, label }
for (const a of rows){
  const { section, base, side } = parse(a.label, a.name)
  const sec = section || '00'
  groups[sec] ??= {}
  const key = base || a.name
  const g = (groups[sec][key] ??= { base:key, type:TYPE[a.type]||a.type.toLowerCase(), sides:{}, label:(a.label||'').replace(/\s*(LF|RF)\s*$/i,'').replace(/^\d+[.\s]+/,'').trim() })
  g.sides[side] = a.name   // map our side -> dataverse column
}

// Emit ordered structure
const SECTION_NAMES = {
  '00':'header','22':'foot_leg_geometry','23':'toe_heights','24':'pfs','25':'toe_shape',
  '31':'cork','35':'leg_length','41':'upper_height','42':'upper_leather','43':'lining',
  '44':'closure','45':'stretch','47':'collar','48':'tongue','51':'extras',
  '211':'measurements','212':'measurements','213':'measurements','214':'measurements',
  '215':'measurements','216':'measurements','217':'measurements','218':'measurements',
  '320':'supplement','321':'supplement','322':'supplement','330':'supplement','331':'heel_correction',
  '332':'ball_correction','333':'toe_correction','341':'rocker','342':'flare_back','343':'flare_front',
  '611':'sole_heel','612':'sole_wedge','613':'sole_wedge','614':'sole_wedge','615':'sole_height',
  '616':'sole_measurement','618':'sole_material','619':'sole_flare','621':'stiffener','622':'toe_cap',
}
const out = []
for (const sec of Object.keys(groups).sort((a,b)=>(parseInt(a)||999)-(parseInt(b)||999))){
  for (const key of Object.keys(groups[sec])){
    const g = groups[sec][key]
    const sides = Object.keys(g.sides)
    out.push({
      section: SECTION_NAMES[sec] || `sec_${sec}`,
      sectionCode: sec,
      key: g.base,
      label: g.label,
      type: g.type,
      sided: !(sides.length===1 && sides[0]==='g'),
      dataverse: g.sides,           // { l|r|g : column name }
    })
  }
}
writeFileSync('docs/custom-orders-structured.json', JSON.stringify(out,null,2))
// Summary
const bySec = {}; for(const o of out){ bySec[o.section]=(bySec[o.section]||0)+1 }
console.log(`Structured fields: ${out.length} (from ${rows.length} non-virtual attrs)\n`)
for(const [s,n] of Object.entries(bySec)) console.log(`  ${s.padEnd(22)} ${n}`)
console.log(`\n-> docs/custom-orders-structured.json`)
