/**
 * Diagnóstico READ-ONLY: encomendas JÁ EXPORTADAS para a consola (erp_exported_at
 * definido) que têm additions ZSM no portal — exatamente as que o import v1 do
 * A-Shell (pp001.bpi até 226.7(004)) deixou cair (gravava os slots 087-091 vazios,
 * "ZSM: ainda sem campos no portal").
 *
 * Janela de exposição: ZSM entrou no portal a 2026-06-18 (336e7ed); o cl000
 * (fluxo portal) está em produção desde 2026-06-12.
 *
 * Uso: node scripts/diag-zsm-lost.mjs [--all]   (--all inclui não exportadas)
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
const ZSM_KEYS = ['zsm_prefab', 'zsm_prefab_colour', 'zsm_sheet', 'zsm_sheet_type', 'zsm_sheet_colour']

const sided = v => {
  if (v == null || v === false || v === '') return null
  if (typeof v === 'object') {
    const out = {}
    for (const s of ['l', 'r']) {
      const x = v[s]
      if (x != null && x !== false && x !== '') out[s] = x === true ? '1' : String(x)
    }
    return Object.keys(out).length ? out : null
  }
  return v === true ? '1' : String(v)
}

const { data: orders, error } = await sb
  .from('orders')
  .select('id, order_seq, piedro_order_id, erp_order_ref, reference_customer, status, production_state, created_at, erp_exported_at, additions, company_id')
  .not('additions', 'is', null)
  .gte('created_at', '2026-06-17')
  .order('created_at', { ascending: true })
if (error) { console.error(error.message); process.exit(1) }

const companyIds = [...new Set(orders.map(o => o.company_id).filter(Boolean))]
const { data: companies } = await sb.from('companies').select('id, erp_code, name').in('id', companyIds)
const compById = new Map((companies ?? []).map(c => [c.id, c]))

let affected = 0
const rows = []
for (const o of orders) {
  if (!includeAll && !o.erp_exported_at) continue
  const zsm = {}
  for (const k of ZSM_KEYS) {
    const v = sided(o.additions?.[k])
    if (v) zsm[k] = v
  }
  if (!Object.keys(zsm).length) continue
  affected++
  const c = compById.get(o.company_id)
  rows.push({
    created: (o.created_at ?? '').slice(0, 10),
    exported: (o.erp_exported_at ?? '').slice(0, 10) || '(nao exportada)',
    piedro: o.piedro_order_id ?? '-',
    consola: o.erp_order_ref ?? '-',
    ref_cliente: o.reference_customer ?? '-',
    cliente: c ? `${c.erp_code ?? '?'} ${c.name ?? ''}`.trim() : '?',
    status: `${o.status}/${o.production_state ?? ''}`,
    zsm: JSON.stringify(zsm),
  })
}

console.log(`Encomendas com additions ZSM ${includeAll ? '(todas)' : 'JA EXPORTADAS para a consola'}: ${affected}`)
for (const r of rows) {
  console.log('—'.repeat(100))
  console.log(`  criada ${r.created} · exportada ${r.exported} · Piedro ${r.piedro} · consola ${r.consola} · ${r.status}`)
  console.log(`  cliente ${r.cliente} · ref cliente ${r.ref_cliente}`)
  console.log(`  ZSM: ${r.zsm}`)
}
