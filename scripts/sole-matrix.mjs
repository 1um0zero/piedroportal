import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const emailProfiles = {
  K1: { codes: ['2210','2211','2267'], opt: 'PU Bumper {White,Black} + Sole Sheet {Fish Black,Fish Amber}' },
  K2: { codes: ['2303','2307','2310','2510','2311','2480','2406','2407','2451','2460','2482','2483','2484','2488','2489','2492','2504','2508'], opt: 'Sole: EVA Lightweight {Black,Amber,Off-White} | Full Rubber {Black,Amber,Blue,Pink,White}' },
  K3: { codes: ['2034','2038','2060','2089'], opt: 'EVA Sole Unit {Black,Grey,White,Brown} + Sole Sheet {Black,Amber} (EN:Piedro / NL:Fish)' },
  K4: { codes: ['2105','2115','2118','2123','2126','2133','2137','2151','2160','2189'], opt: 'PU Bumper {White,Black} + Sole Sheet {Rubber Tire B/A, Fish B/A, EVA Nora LW B/A}' },
  KidsNoAdj: { codes: ['2299','2301','2309'], opt: '(sem ajuste)' },
  A1: { codes: ['4800','4318','4610','4590','4580','4527','4523','3614','3612','3613','3611','3618','3617','3627','3628','3590','3591'], opt: 'PU Bumper {White,Black} + Sole Sheet A' },
  A2: { codes: ['4807','4804','4802','4323','4327','4560','4550','4570','4620','4326','4900','5313','5303','5300','3604','3603','3606','3605','5200','3614'], opt: 'EVA Sole {Grey,White,Taupe} + Spoiler {8} + Sole Sheet A' },
  A3: { codes: ['4801','4808','4810','4803','4809','4901','5315','5314','5305','5302','5311','5316','5201'], opt: 'Sportive Sole {White,Black,Beige,Grey} + Sole Sheet A' },
  A4: { codes: ['3469','3467','3485'], opt: 'EVA Sole {Taupe,Black} + Sole Sheet B {EVA Nora LW B/A}' },
  A5: { codes: ['3345','3340','3337','3341','3346','3370','3371','3335','3330'], opt: 'EVA Lightweight Sole {Taupe,Black}' },
  A6: { codes: ['5312','5304','5301','5310','5308','5309'], opt: 'EVA Bumper {White,Black} + Sole Sheet A' },
  A7: { codes: ['3542','3543','3540','3541','3599','3597','3598','3595','3596','3520','3521','3524','5306'], opt: 'Sole {Lightweight Vibram B/Brown, Forli Uomo, Full Rubber Montana B/Brown}' },
  A8: { codes: ['3502','3506','3504','3508'], opt: 'Sole {Nora Plate Blue/LightBody, Black/LightBody, Black/BlackBody}' },
}
const excelKids = {
  'NoAdj': { codes: ['2299','2301','2309','2212','2213','1700','1701','1702','1800'], opt: '(sem ajuste)' },
  'CupSole(G3)': { codes: ['2269','2270','2272','1906','1900','1903','1901','1902','1904','1905'], opt: 'Sole {EVA Black,EVA White,PU White,PU Black} + Plate {Fish Black,Fish Amber}' },
  'StitchedDown(G1)': { codes: ['2303','2312','2314','2315','2310','2316','2504','2482','2492','2488','2407','2483','2484','2480','2489','2601','2604'], opt: 'Sole {EVA Lightweight Black/Off-White, Full Rubber Black/Amber/Blue/Pink/White}' },
  'Trainers(G4)': { codes: ['2089','2034','2134','2090','2038','2138','2060','2091','2092'], opt: 'Sole {EVA Runner + Spoiler combos} + Plate {Fish Black,Fish Amber}' },
  'HighMidTops(G5)': { codes: ['2160','2123','2133','2105','2115','2151','2189','2118','2137','2126'], opt: 'Sole {PU White,PU Black,EVA Black,EVA White} + Plate {Fish Black,Fish Amber}' },
}
const corr = { 'CupSole(G3)': 'K1', 'StitchedDown(G1)': 'K2', 'Trainers(G4)': 'K3', 'HighMidTops(G5)': 'K4', 'NoAdj': 'KidsNoAdj' }

const all = []
for (let f = 0; ; f += 1000) { const { data } = await sb.from('products').select('style_name,section').range(f, f + 999); if (!data || !data.length) break; all.push(...data); if (data.length < 1000) break }
const secOf = c => { const r = all.find(p => p.style_name === c || p.style_name === c + 'K' || p.style_name === c + 'B'); return r ? r.section : '?' }

const codes = new Set()
for (const p of Object.values(emailProfiles)) p.codes.forEach(c => codes.add(c))
for (const g of Object.values(excelKids)) g.codes.forEach(c => codes.add(c))

const rows = [...codes].map(c => ({
  code: c, sec: secOf(c),
  emP: Object.entries(emailProfiles).filter(([, v]) => v.codes.includes(c)).map(([k]) => k),
  exG: Object.entries(excelKids).filter(([, v]) => v.codes.includes(c)).map(([k]) => k),
}))

function fo(r) {
  const { emP, exG } = r
  if (r.sec !== 'KIDS') {
    if (emP.length > 1) return { flag: `⚠ CONFLITO: em ${emP.join(' e ')}`, opt: emP.map(p => emailProfiles[p].opt).join('  ||  '), grp: emP.join(',') }
    if (emP.length === 1) return { flag: '', opt: emailProfiles[emP[0]].opt, grp: emP[0] }
    return { flag: '', opt: '?', grp: '?' }
  }
  if (exG.length && emP.length) {
    if (exG.some(g => corr[g] === emP[0])) return { flag: 'OK (Excel+email)', opt: excelKids[exG[0]].opt, grp: `${exG[0]} / ${emP.join(',')}` }
    return { flag: `⚠ CONFLITO grupo: Excel=${exG.join(',')} vs email=${emP.join(',')}`, opt: `Excel: ${excelKids[exG[0]].opt}  ||  email: ${emailProfiles[emP[0]].opt}`, grp: `${exG.join(',')} ≠ ${emP.join(',')}` }
  }
  if (exG.length) return { flag: 'só Excel', opt: excelKids[exG[0]].opt, grp: exG[0] }
  if (emP.length) return { flag: '⚠ só email (ausente do Excel)', opt: emailProfiles[emP[0]].opt, grp: emP.join(',') }
  return { flag: '', opt: '?', grp: '?' }
}

const md = []
md.push('# Matriz de solas por style (todas as listas fundidas)\n')
md.push('Cruzamento Excel(kids) + email(kids) + email(adults) com o catálogo `products`.')
md.push('`K` = mesma regra (variante de escala). Ordenado por style dentro de cada secção.\n')
for (const SEC of ['KIDS', 'ADULTS']) {
  const sub = rows.filter(r => SEC === 'KIDS' ? r.sec === 'KIDS' : (r.sec === 'MEN' || r.sec === 'WOMEN'))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
  md.push(`\n## ${SEC} (${sub.length})\n`)
  md.push('| Style | Grupo / Perfil | Opções | Discrepância |')
  md.push('|---|---|---|---|')
  for (const r of sub) { const f = fo(r); md.push(`| ${r.code} | ${f.grp} | ${f.opt} | ${f.flag} |`) }
}
const other = rows.filter(r => !['KIDS', 'MEN', 'WOMEN'].includes(r.sec))
if (other.length) { md.push(`\n## OUTROS (${other.length})\n`); for (const r of other) { const f = fo(r); md.push(`- ${r.code} [${r.sec}] ${f.grp} — ${f.flag}`) } }
writeFileSync('docs/sole-hierarchy/MATRIZ-STYLES.md', md.join('\n') + '\n')

const conf = rows.map(r => ({ r, f: fo(r) })).filter(x => x.f.flag.includes('⚠'))
console.log('rows:', rows.length, '| discrepâncias:', conf.length)
conf.forEach(x => console.log('  ' + x.r.code + ' [' + x.r.sec + '] ' + x.f.flag))
