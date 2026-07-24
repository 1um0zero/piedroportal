/**
 * Diagnóstico READ-ONLY: encomendas de 2026 com additions "órfãs" — filho com
 * valor gravado mas toggle-PAI desligado (por pé). Caso-tipo: 26005831
 * (sw_taper.r preso com sole_wedge.r=false). Ver recado-pp-orfaos-pai-filho.md.
 *
 * Uso: node scripts/diag-orfaos-pai-filho.mjs [--all]  (--all inclui não exportadas)
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const includeAll = process.argv.includes('--all')

const PARENTS = {
  sole_float: ['sf_medial', 'sf_lateral', 'sf_taper'],
  sole_wedge: ['sw_medial', 'sw_lateral', 'sw_taper'],
  heel_wedge: ['hw_medial', 'hw_lateral', 'hw_taper'],
  heel_float: ['hf_medial', 'hf_lateral'],
  rocker: ['rocker_toes', 'rocker_joint', 'rocker_heel'],
  amend_sole: ['sole_type', 'spoiler', 'runner_sole'],
  pu_bumper: ['pu_type'],
  zsm_prefab: ['zsm_prefab_colour'],
  zsm_sheet: ['zsm_sheet_type', 'zsm_sheet_colour'],
  haglund: ['haglund_h', 'haglund_p'],
  xs_med_ank: ['med_ank_h'],
  xs_lat_ank: ['lat_ank_h'],
  gen_raise: ['gen_raise_add'],
}

const side = (v, s) => (v != null && typeof v === 'object') ? v[s] : (s === 'l' ? v : null)
const on = v => !(v == null || v === false || v === '' || v === 0)

let rows = [], scanned = 0, from = 0
while (true) {
  const { data, error } = await sb
    .from('orders')
    .select('piedro_order_id, erp_order_ref, reference_customer, status, production_state, created_at, erp_exported_at, additions, company_id, companies(erp_code, name)')
    .not('additions', 'is', null)
    .gte('created_at', '2026-01-01')
    .order('created_at', { ascending: true })
    .range(from, from + 999)
  if (error) { console.error(error.message); process.exit(1) }
  if (!data.length) break
  for (const o of data) {
    scanned++
    if (!includeAll && !o.erp_exported_at) continue
    const orphans = []
    for (const [p, kids] of Object.entries(PARENTS)) {
      for (const s of ['l', 'r']) {
        if (on(side(o.additions?.[p], s))) continue
        for (const k of kids) {
          const v = side(o.additions?.[k], s)
          if (on(v)) orphans.push(`${k}.${s}=${v === true ? '1' : v} (${p}.${s} OFF)`)
        }
      }
    }
    if (!orphans.length) continue
    rows.push({
      created: (o.created_at ?? '').slice(0, 10),
      exported: (o.erp_exported_at ?? '').slice(0, 10) || '(nao exportada)',
      piedro: o.piedro_order_id ?? '-',
      consola: o.erp_order_ref ?? '-',
      ref: o.reference_customer ?? '-',
      cliente: o.companies ? `${o.companies.erp_code ?? '?'} ${o.companies.name ?? ''}`.trim() : '?',
      status: `${o.status}/${o.production_state ?? ''}`,
      orphans,
    })
  }
  if (data.length < 1000) break
  from += 1000
}

console.log(`Analisadas ${scanned} encomendas de 2026 com additions; com ORFAOS ${includeAll ? '(todas)' : '(exportadas)'}: ${rows.length}`)
for (const r of rows) {
  console.log('—'.repeat(100))
  console.log(`  criada ${r.created} · exportada ${r.exported} · Piedro ${r.piedro} · consola ${r.consola} · ${r.status}`)
  console.log(`  cliente ${r.cliente} · ref ${r.ref}`)
  for (const x of r.orphans) console.log(`    ${x}`)
}
