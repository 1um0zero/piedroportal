/**
 * Additions Insights — Voetmax pilot: enable gating + real aggregation.
 *
 *   npx tsx scripts/insights-voetmax.ts              # report only (read-only)
 *   npx tsx scripts/insights-voetmax.ts --enable     # also flip insights_enabled=true
 *
 * Uses the REAL metrics engine (topLevelFields + computeInsights) so the numbers
 * printed here are exactly what the /orders/insights dashboard would render.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { topLevelFields, computeInsights, type InsightOrder } from '../src/lib/insights/metrics'
import { zoneForField } from '../src/lib/insights/addition-zones'

type OrderRow = {
  id: string
  additions: Record<string, unknown> | null
  created_at: string
  clinician: string | null
  user_id: string | null
  company_id: string
}

const ERP_CODE = '080159'
const DO_ENABLE = process.argv.includes('--enable')

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)

async function fetchAllOrders(companyIds: string[]): Promise<OrderRow[]> {
  let all: OrderRow[] = [], from = 0
  for (;;) {
    const { data, error } = await sb.from('orders')
      .select('id, additions, created_at, clinician, user_id, company_id, companies(name)')
      .neq('status', 'draft')
      .in('company_id', companyIds)
      .order('created_at', { ascending: false })
      .range(from, from + 999)
    if (error) throw error
    all = all.concat((data ?? []) as unknown as OrderRow[])
    if (!data || data.length < 1000) break
    from += 1000
  }
  return all
}

const pad = (s: unknown, n: number) => String(s).padEnd(n)
const padL = (s: unknown, n: number) => String(s).padStart(n)

async function main() {
  // ── 1. Find the Voetmax companies (shared erp_code, one per store) ─────────
  const { data: companies, error } = await sb.from('companies')
    .select('id, name, erp_code, city, insights_enabled')
    .eq('erp_code', ERP_CODE)
    .order('name')
  if (error) throw error
  if (!companies?.length) { console.log(`No company with erp_code ${ERP_CODE}`); return }

  console.log(`\n=== Voetmax companies (erp_code ${ERP_CODE}) ===`)
  for (const c of companies) {
    console.log(`  ${pad(c.name, 34)} ${pad(c.city ?? '—', 18)} insights=${c.insights_enabled ? 'ON ' : 'off'}  ${c.id}`)
  }
  const companyIds = companies.map(c => c.id)

  // ── 2. Optionally enable the gate on ALL Voetmax stores ────────────────────
  if (DO_ENABLE) {
    const { error: upErr } = await sb.from('companies')
      .update({ insights_enabled: true }).in('id', companyIds)
    if (upErr) throw upErr
    console.log(`\n>>> insights_enabled = true on ${companyIds.length} Voetmax company(ies).`)
  }

  // ── 3. Aggregate the REAL orders with the production metrics engine ─────────
  const rows = await fetchAllOrders(companyIds)
  console.log(`\n=== Orders (non-draft) for Voetmax: ${rows.length} ===`)
  if (!rows.length) { console.log('No orders — nothing to aggregate.'); return }

  const nameById = new Map(companies.map(c => [c.id, c.name]))

  const byCompany: InsightOrder[] = rows.map(o => ({
    fields: topLevelFields(o.additions),
    group: o.company_id,
    groupLabel: nameById.get(o.company_id) ?? '—',
    createdAt: o.created_at,
  }))
  const byClinician: InsightOrder[] = rows.map(o => ({
    fields: topLevelFields(o.additions),
    group: (o.clinician || '(blank)').trim() || '(blank)',
    createdAt: o.created_at,
  }))

  const R = computeInsights(byCompany)

  console.log(`\n--- POPULATION ---`)
  console.log(`  orders ................. ${R.orderCount}`)
  console.log(`  additions total ........ ${R.additionsTotal}`)
  console.log(`  additions / order ...... ${R.additionsPerOrder.toFixed(3)}   (baseline)`)
  const withAdds = byCompany.filter(o => o.fields.length > 0).length
  console.log(`  orders with ≥1 addition  ${withAdds}  (${(100 * withAdds / R.orderCount).toFixed(0)}%)`)

  console.log(`\n--- OCCURRENCES BY ZONE (paints the shoe) ---`)
  console.log(`  ${pad('zone', 10)} ${padL('count', 6)} ${padL('/order', 7)}   top fields`)
  for (const z of R.zones) {
    const top = z.fields.slice(0, 4).map(f => `${f.field}:${f.count}`).join('  ')
    console.log(`  ${pad(z.zone, 10)} ${padL(z.count, 6)} ${padL(z.perOrder.toFixed(3), 7)}   ${top}`)
  }
  console.log(`  zoneMax = ${R.zoneMax}`)

  // Overall field frequency (all zones), top 20
  const fieldTotals = new Map<string, number>()
  for (const z of R.zones) for (const f of z.fields) fieldTotals.set(f.field, (fieldTotals.get(f.field) ?? 0) + f.count)
  const topFields = [...fieldTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  console.log(`\n--- TOP FIELDS overall ---`)
  for (const [f, c] of topFields) console.log(`  ${pad(f, 20)} ${padL(c, 5)}   [${zoneForField(f)}]`)

  // ── 4. Outliers by LOCATION (company) ──────────────────────────────────────
  console.log(`\n--- GROUPS by LOCATION (company)  [outlier ≥ ${(R.outlierFactor * 100).toFixed(0)}% of baseline, min ${R.minGroupOrders} orders] ---`)
  console.log(`  ${pad('company', 34)} ${padL('orders', 6)} ${padL('adds', 5)} ${padL('/order', 7)} ${padL('dev', 7)}  flags`)
  for (const g of R.groups) {
    const flag = g.outlier ? 'OUTLIER' : ''
    const hot = g.hotZones.length ? ` hot:[${g.hotZones.join(',')}]` : ''
    console.log(`  ${pad(g.label, 34)} ${padL(g.orders, 6)} ${padL(g.additions, 5)} ${padL(g.perOrder.toFixed(3), 7)} ${padL((g.deviation >= 0 ? '+' : '') + (g.deviation * 100).toFixed(0) + '%', 7)}  ${flag}${hot}`)
  }

  // ── 5. Outliers by CLINICIAN (free-text orders.clinician) ──────────────────
  const RC = computeInsights(byClinician)
  console.log(`\n--- GROUPS by CLINICIAN (orders.clinician free-text)  [same thresholds] ---`)
  console.log(`  distinct clinician values: ${RC.groups.length}`)
  console.log(`  ${pad('clinician', 34)} ${padL('orders', 6)} ${padL('adds', 5)} ${padL('/order', 7)} ${padL('dev', 7)}  flags`)
  for (const g of RC.groups.slice(0, 30)) {
    const flag = g.outlier ? 'OUTLIER' : ''
    const hot = g.hotZones.length ? ` hot:[${g.hotZones.join(',')}]` : ''
    console.log(`  ${pad(g.label.slice(0, 33), 34)} ${padL(g.orders, 6)} ${padL(g.additions, 5)} ${padL(g.perOrder.toFixed(3), 7)} ${padL((g.deviation >= 0 ? '+' : '') + (g.deviation * 100).toFixed(0) + '%', 7)}  ${flag}${hot}`)
  }
  const outliers = RC.groups.filter(g => g.outlier).length
  console.log(`  clinician outliers flagged: ${outliers}`)

  console.log(`\nDone.`)
}
main().catch(e => { console.error('ERROR', e); process.exit(1) })
