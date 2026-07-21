import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { fetchAll } from '@/lib/fetch-all'
import { topLevelFields } from '@/lib/insights/metrics'
import InsightsDashboard, { type ClientOrder } from '@/components/insights/InsightsDashboard'
import AdminInsightsClientPicker, { type ClientOption } from '@/components/admin/AdminInsightsClientPicker'

// ─────────────────────────────────────────────────────────────────────────────
// Additions Insights — BACK-OFFICE view (Piedro staff).
//
// Staff-first by design: Piedro decides what a customer may see only AFTER
// having seen it themselves. Scope is deliberately ONE CLIENT AT A TIME — a
// client is a company GROUP sharing an erp_code (a multi-store client such as
// Voetmax is 6 companies / one erp_code, see project_multistore_departments), so
// the "location" axis compares that client's own stores. There is intentionally
// NO cross-client aggregation here: comparing clients against each other is
// commercially sensitive and was not asked for.
//
// Access: piedro_admin + super_admin only (requirePiedroAdminPage).
// ─────────────────────────────────────────────────────────────────────────────

type CompanyRow = { id: string; name: string; erp_code: string | null }

export default async function AdminInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  await requirePiedroAdminPage()
  const { c: selectedKey } = await searchParams
  const t = await getTranslations('insights')
  const service = createServiceClient()

  // ── Client list = companies grouped by erp_code ────────────────────────────
  const companies = await fetchAll<CompanyRow>(page =>
    service.from('companies').select('id, name, erp_code').order('name').range(page.from, page.to)
  )

  // Group key: the erp_code when present, else the company id (a client with no
  // erp_code is its own group rather than being lumped with every other blank).
  const groupKeyOf = (c: CompanyRow) => (c.erp_code?.trim() ? `erp:${c.erp_code.trim()}` : `id:${c.id}`)

  const groups = new Map<string, { key: string; label: string; companies: CompanyRow[] }>()
  for (const c of companies) {
    const key = groupKeyOf(c)
    const g = groups.get(key) ?? { key, label: c.name, companies: [] }
    g.companies.push(c)
    groups.set(key, g)
  }
  // A multi-store client's group label is the shared prefix of its store names
  // ("Voetmax - LOCATIE ELST" + … → "Voetmax"), falling back to the first name.
  for (const g of groups.values()) {
    if (g.companies.length > 1) {
      const names = g.companies.map(c => c.name)
      let prefix = names[0]
      for (const n of names.slice(1)) {
        let i = 0
        while (i < prefix.length && i < n.length && prefix[i] === n[i]) i++
        prefix = prefix.slice(0, i)
      }
      const cleaned = prefix.replace(/[\s\-–—_/|,:.]+$/, '').trim()
      g.label = cleaned.length >= 3 ? cleaned : names[0]
    }
  }

  // Order counts per company → per group, so the picker can rank clients by
  // volume and hide the ones with nothing to analyse.
  const counts = new Map<string, number>()
  const countRows = await fetchAll<{ company_id: string | null }>(page =>
    service.from('orders').select('company_id').neq('status', 'draft').range(page.from, page.to)
  )
  for (const r of countRows) {
    if (!r.company_id) continue
    counts.set(r.company_id, (counts.get(r.company_id) ?? 0) + 1)
  }

  const options: ClientOption[] = [...groups.values()]
    .map(g => ({
      key: g.key,
      label: g.label,
      stores: g.companies.length,
      orders: g.companies.reduce((s, c) => s + (counts.get(c.id) ?? 0), 0),
      erpCode: g.companies[0].erp_code ?? '',
    }))
    .filter(o => o.orders > 0)
    .sort((a, b) => b.orders - a.orders || a.label.localeCompare(b.label))

  const selected = selectedKey ? groups.get(selectedKey) ?? null : null
  const selectedOption = selected ? options.find(o => o.key === selected.key) ?? null : null

  // ── Selected client's orders → the same reduction the customer page uses ────
  let orders: ClientOrder[] = []
  let multiCompany = false
  if (selected) {
    const companyIds = selected.companies.map(c => c.id)
    const nameById = new Map(selected.companies.map(c => [c.id, c.name]))
    // Paginated: every metric is computed over the whole array — a truncated
    // fetch would silently under-report the baseline and hide outliers.
    const rows = await fetchAll<{
      additions: Record<string, unknown> | null
      created_at: string
      clinician: string | null
      company_id: string
    }>(page =>
      service
        .from('orders')
        .select('additions, created_at, clinician, company_id')
        .neq('status', 'draft')
        .in('company_id', companyIds)
        .order('created_at', { ascending: false })
        .range(page.from, page.to)
    )
    orders = rows.map(o => ({
      fields: topLevelFields(o.additions),
      company: nameById.get(o.company_id) ?? '—',
      clinician: o.clinician ?? '',
      createdAt: o.created_at,
    }))
    multiCompany = new Set(orders.map(o => o.company)).size > 1
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pt-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-900">{t('admin.title')}</h1>
        <p className="text-xs text-stone-400 mt-0.5">{t('admin.subtitle')}</p>
      </div>

      <AdminInsightsClientPicker options={options} selectedKey={selected?.key ?? null} />

      {!selected ? (
        <div className="bg-white rounded-[14px] p-16 flex flex-col items-center text-center gap-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <p className="text-sm text-stone-500 max-w-sm">{t('admin.pick_client')}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-[14px] p-16 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="text-sm text-stone-500">{t('empty')}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-stone-400">
            {t('admin.scope', {
              client: selectedOption?.label ?? '',
              stores: selected.companies.length,
              orders: orders.length,
            })}
          </p>
          {/* The dashboard renders its own container/padding. */}
          <div className="-mx-6">
            <InsightsDashboard orders={orders} multiCompany={multiCompany} />
          </div>
        </>
      )}
    </div>
  )
}
