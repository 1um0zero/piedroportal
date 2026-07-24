/**
 * Diagnóstico READ-ONLY: encomendas JÁ EXPORTADAS para a consola que têm as
 * additions NOVAS do portal (slots 092-099 + stiff_cutout 095) — as que uma
 * consola com cl000 antigo (pré-tabela/pré-slots) deixou cair na importação.
 *
 * Chaves: sf_taper/sw_taper/hw_taper (Aflopend), heel_round, gen_raise,
 * gen_raise_add (Generale Verhoging), stiff_cutout (Contrefort uitsparing).
 *
 * Uso: node scripts/diag-newadds-lost.mjs [--all]   (--all inclui não exportadas)
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
const NEW_KEYS = ['sf_taper', 'sw_taper', 'hw_taper', 'heel_round', 'gen_raise', 'gen_raise_add', 'stiff_cutout']

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
  .gte('created_at', '2026-06-25')
  .order('created_at', { ascending: true })
if (error) { console.error(error.message); process.exit(1) }

const companyIds = [...new Set(orders.map(o => o.company_id).filter(Boolean))]
const { data: companies } = await sb.from('companies').select('id, erp_code, name').in('id', companyIds)
const compById = new Map((companies ?? []).map(c => [c.id, c]))

let affected = 0
const rows = []
for (const o of orders) {
  if (!includeAll && !o.erp_exported_at) continue
  const hit = {}
  for (const k of NEW_KEYS) {
    const v = sided(o.additions?.[k])
    if (v) hit[k] = v
  }
  if (!Object.keys(hit).length) continue
  affected++
  const c = compById.get(o.company_id)
  rows.push({
    created: (o.created_at ?? '').slice(0, 10),
    exported: (o.erp_exported_at ?? '').slice(0, 16).replace('T', ' ') || '(nao exportada)',
    piedro: o.piedro_order_id ?? '-',
    consola: o.erp_order_ref ?? '-',
    ref_cliente: o.reference_customer ?? '-',
    cliente: c ? `${c.erp_code ?? '?'} ${c.name ?? ''}`.trim() : '?',
    status: `${o.status}/${o.production_state ?? ''}`,
    adds: JSON.stringify(hit),
  })
}

console.log(`Encomendas com additions NOVAS ${includeAll ? '(todas)' : 'JA EXPORTADAS para a consola'}: ${affected}`)
for (const r of rows) {
  console.log('—'.repeat(100))
  console.log(`  criada ${r.created} · exportada ${r.exported} · Piedro ${r.piedro} · consola ${r.consola} · ${r.status}`)
  console.log(`  cliente ${r.cliente} · ref cliente ${r.ref_cliente}`)
  console.log(`  novas: ${r.adds}`)
}
