import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// All codes that already HAVE a rule (email + excel kids) — same as matrix script
const ruled = new Set([
  // email kids
  '2210','2211','2267','2303','2307','2310','2510','2311','2480','2406','2407','2451','2460','2482','2483','2484','2488','2489','2492','2504','2508','2034','2038','2060','2089','2105','2115','2118','2123','2126','2133','2137','2151','2160','2189','2299','2301','2309',
  // excel kids (extra)
  '2212','2213','1700','1701','1702','1800','2269','2270','2272','1906','1900','1903','1901','1902','1904','1905','2312','2314','2315','2316','2601','2604','2134','2090','2138','2091','2092',
  // adults
  '4800','4318','4610','4590','4580','4527','4523','3614','3612','3613','3611','3618','3617','3627','3628','3590','3591','4807','4804','4802','4323','4327','4560','4550','4570','4620','4326','4900','5313','5303','5300','3604','3603','3606','3605','5200','4801','4808','4810','4803','4809','4901','5315','5314','5305','5302','5311','5316','5201','3469','3467','3485','3345','3340','3337','3341','3346','3370','3371','3335','3330','5312','5304','5301','5310','5308','5309','3542','3543','3540','3541','3599','3597','3598','3595','3596','3520','3521','3524','5306','3502','3506','3504','3508',
  // ZSM (cliente exclusivo, regra à parte — não é para validação da Anabela)
  'B5760','B5761','B5715','B5716','B5725','B5726','B5748','B5749','B5758','B5759','B5746','B5747','B5750','B5751','B5732','B5733','B5740','B5741','B5762','B5763','B5727','B5728','B5723','B5724','B5744','B5745','B5734','B5735','B5742','B5743','B5754','B5755','B5713','B5714','B5764','B5765','B5756','B5757','B5730','B5731','B5752','B5753',
])

const all = []
for (let f = 0; ; f += 1000) { const { data } = await sb.from('products').select('style_name,section,active,exclusive').range(f, f + 999); if (!data || !data.length) break; all.push(...data); if (data.length < 1000) break }

// per base style: section, has any active variant, exclusive label
const SN = new Set(all.map(p => p.style_name))
const base = s => s.replace(/[KB]$/, '')
const byBase = new Map()
for (const p of all) {
  const b = base(p.style_name)
  const e = byBase.get(b) || { base: b, section: p.section, active: false, variants: new Set(), exclusive: '' }
  e.variants.add(p.style_name); if (p.active) e.active = true; if (!e.section) e.section = p.section
  if (p.exclusive && !e.exclusive) e.exclusive = p.exclusive
  byBase.set(b, e)
}

// uncovered = base styles with NO rule (and base not in ruled, none of its variants ruled)
const uncovered = [...byBase.values()].filter(e => !ruled.has(e.base) && ![...e.variants].some(v => ruled.has(v) || ruled.has(base(v))))

const secLabel = { KIDS: 'Crianças', MEN: 'Homem', WOMEN: 'Mulher' }
const active = uncovered.filter(e => e.active)
const inactive = uncovered.filter(e => !e.active)
console.log('uncovered base styles:', uncovered.length, '| ATIVOS:', active.length, '| inativos:', inactive.length)
const bySec = {}
for (const e of active) (bySec[e.section] = bySec[e.section] || []).push(e.base)
for (const s of Object.keys(bySec)) console.log('  ATIVOS', s, bySec[s].length)

// ---------- Build workbook ----------
const wb = XLSX.utils.book_new()

// Sheet 1: explanatory doubts
const intro = [
  ['Validação das dependências de solas — Piedro Portal'],
  [],
  ['Olá Anabela,'],
  [],
  ['Antes de implementarmos no portal a hierarquia de solas (qual sola / sole sheet / spoiler fica'],
  ['disponível por modelo), cruzámos as tuas listas (Excel das crianças + e-mails de adultos e crianças)'],
  ['com o catálogo do portal. Está tudo coerente; faltam poucos pontos a confirmar.'],
  [],
  ['As regras por modelo já validadas estão na folha "Regras por modelo".'],
  ['Os modelos que ainda não têm regra atribuída (e estão ATIVOS na loja) estão na folha "Sem regra (ativos)".'],
  [],
  ['PONTOS A ESCLARECER:'],
  [],
  ['1) Variantes "K": cada modelo existe como NNNN e NNNNK (ex. 2303 e 2303K). Confirmámos contigo que'],
  ['   são iguais — a regra aplica-se às duas. (OK, sem ação.)'],
  [],
  ['2) Modelo 3614 (Homem): aparece em DOIS grupos de adultos — Opção 1 (PU Bumper) e Opção 2'],
  ['   (EVA Sole + Spoiler). A qual pertence?'],
  [],
  ['3) Adultos Opções 7 e 8: o cabeçalho dizia "sola e sole sheet" mas só foi listada a SOLA.'],
  ['   Têm sole sheet, ou só a sola?'],
  [],
  ['4) Crianças, grupo "EVA Sole Unit" (2034, 2038, 2060, 2089): o sole sheet vem em inglês como'],
  ['   "Piedro Black / Piedro Amber" mas em holandês como "Fish Black / Fish Amber". Qual é o correto?'],
  [],
  ['5) FOLHA "Sem regra (Piedro)": modelos Piedro à venda que não estão em nenhuma lista de solas.'],
  ['   Para cada um, indica por favor: "sem ajuste de sola" OU o grupo a que pertence.'],
  [],
  ['6) FOLHA "Sem regra (exclusivos)": modelos de clientes exclusivos (Livingstone, TUR, MME, etc.),'],
  ['   à semelhança da ZSM. As regras de sola destes seguem o respetivo cliente — confirma se têm'],
  ['   ajuste de sola e qual, ou se não têm.'],
  [],
  ['Nota: os modelos sem regra que estão INATIVOS (descontinuados) foram excluídos — não precisam de revisão.'],
]
const wsIntro = XLSX.utils.aoa_to_sheet(intro)
wsIntro['!cols'] = [{ wch: 100 }]
XLSX.utils.book_append_sheet(wb, wsIntro, 'Dúvidas a esclarecer')

// Sheet 2: validated rules per model (from matrix logic) — compact: section, style, group, options
const emailProfiles = {
  K1: 'PU Bumper {White,Black} + Sole Sheet {Fish Black,Fish Amber}',
  K2: 'Sole: EVA Lightweight {Black,Amber,Off-White} | Full Rubber {Black,Amber,Blue,Pink,White}',
  K3: 'EVA Sole Unit {Black,Grey,White,Brown} + Sole Sheet {Black,Amber}',
  K4: 'PU Bumper {White,Black} + Sole Sheet {Rubber Tire B/A, Fish B/A, EVA Nora LW B/A}',
  A1: 'PU Bumper {White,Black} + Sole Sheet A', A2: 'EVA Sole {Grey,White,Taupe} + Spoiler {8} + Sole Sheet A',
  A3: 'Sportive Sole {White,Black,Beige,Grey} + Sole Sheet A', A4: 'EVA Sole {Taupe,Black} + Sole Sheet B',
  A5: 'EVA Lightweight Sole {Taupe,Black}', A6: 'EVA Bumper {White,Black} + Sole Sheet A',
  A7: 'Sole {Lightweight Vibram B/Brown, Forli Uomo, Full Rubber Montana B/Brown}',
  A8: 'Sole {Nora Plate Blue/LightBody, Black/LightBody, Black/BlackBody}',
}
const excelOpt = {
  'CupSole(G3)': 'Sole {EVA Black,EVA White,PU White,PU Black} + Plate {Fish Black,Fish Amber}',
  'StitchedDown(G1)': 'Sole {EVA Lightweight Black/Off-White, Full Rubber Black/Amber/Blue/Pink/White}',
  'Trainers(G4)': 'Sole {EVA Runner + Spoiler} + Plate {Fish Black,Fish Amber}',
  'HighMidTops(G5)': 'Sole {PU White,PU Black,EVA Black,EVA White} + Plate {Fish Black,Fish Amber}',
  'NoAdj': '(sem ajuste)',
}
const groups = {
  'NoAdj': ['2299','2301','2309','2212','2213','1700','1701','1702','1800'],
  'CupSole(G3)': ['2269','2270','2272','1906','1900','1903','1901','1902','1904','1905'],
  'StitchedDown(G1)': ['2303','2312','2314','2315','2310','2316','2504','2482','2492','2488','2407','2483','2484','2480','2489','2601','2604'],
  'Trainers(G4)': ['2089','2034','2134','2090','2038','2138','2060','2091','2092'],
  'HighMidTops(G5)': ['2160','2123','2133','2105','2115','2151','2189','2118','2137','2126'],
}
const adultGroups = { A1:emailProfiles.A1,A2:emailProfiles.A2,A3:emailProfiles.A3,A4:emailProfiles.A4,A5:emailProfiles.A5,A6:emailProfiles.A6,A7:emailProfiles.A7,A8:emailProfiles.A8 }
const adultCodes = {
  A1:['4800','4318','4610','4590','4580','4527','4523','3614','3612','3613','3611','3618','3617','3627','3628','3590','3591'],
  A2:['4807','4804','4802','4323','4327','4560','4550','4570','4620','4326','4900','5313','5303','5300','3604','3603','3606','3605','5200','3614'],
  A3:['4801','4808','4810','4803','4809','4901','5315','5314','5305','5302','5311','5316','5201'],
  A4:['3469','3467','3485'], A5:['3345','3340','3337','3341','3346','3370','3371','3335','3330'],
  A6:['5312','5304','5301','5310','5308','5309'],
  A7:['3542','3543','3540','3541','3599','3597','3598','3595','3596','3520','3521','3524','5306'],
  A8:['3502','3506','3504','3508'],
}
const ruleRows = [['Secção', 'Style', 'Grupo', 'Opções', 'Nota']]
for (const [g, codes] of Object.entries(groups)) for (const c of codes) ruleRows.push(['Crianças', c, g, excelOpt[g], ''])
for (const [g, codes] of Object.entries(adultCodes)) for (const c of codes) {
  const note = c === '3614' ? 'CONFLITO: também em A1/A2 — confirmar' : ''
  ruleRows.push([(byBase.get(c)?.section === 'WOMEN' ? 'Mulher' : 'Homem'), c, g, adultGroups[g], note])
}
const wsRules = XLSX.utils.aoa_to_sheet(ruleRows)
wsRules['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 70 }, { wch: 30 }]
XLSX.utils.book_append_sheet(wb, wsRules, 'Regras por modelo')

// Sheet 3: uncovered ACTIVE Piedro (non-exclusive) styles to triage
const piedro = active.filter(e => !e.exclusive)
const excl = active.filter(e => e.exclusive)
const sortFn = (a, b) => (a.section + a.base).localeCompare(b.section + b.base, undefined, { numeric: true })

const triRows = [['Secção', 'Style', 'Variantes', 'Sem ajuste? (Sim/Não)', 'Se não, qual grupo?']]
for (const e of piedro.sort(sortFn))
  triRows.push([secLabel[e.section] || e.section, e.base, [...e.variants].sort().join(' / '), '', ''])
const wsTri = XLSX.utils.aoa_to_sheet(triRows)
wsTri['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 24 }, { wch: 20 }, { wch: 24 }]
XLSX.utils.book_append_sheet(wb, wsTri, 'Sem regra (Piedro)')

// Sheet 4: uncovered ACTIVE exclusive-client styles
const exRows = [['Cliente exclusivo', 'Secção', 'Style', 'Variantes', 'Tem ajuste? (Sim/Não)', 'Se sim, qual?']]
for (const e of excl.sort((a, b) => (a.exclusive + a.section + a.base).localeCompare(b.exclusive + b.section + b.base, undefined, { numeric: true })))
  exRows.push([e.exclusive, secLabel[e.section] || e.section, e.base, [...e.variants].sort().join(' / '), '', ''])
const wsEx = XLSX.utils.aoa_to_sheet(exRows)
wsEx['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 24 }, { wch: 18 }, { wch: 24 }]
XLSX.utils.book_append_sheet(wb, wsEx, 'Sem regra (exclusivos)')

XLSX.writeFile(wb, 'docs/sole-hierarchy/Piedro-Solas-Validacao-Anabela.xlsx')
console.log('\nEscrito: docs/sole-hierarchy/Piedro-Solas-Validacao-Anabela.xlsx')
console.log('Folhas: Dúvidas | Regras por modelo (' + (ruleRows.length - 1) + ') | Sem regra Piedro (' + piedro.length + ') | Sem regra exclusivos (' + excl.length + ')')
