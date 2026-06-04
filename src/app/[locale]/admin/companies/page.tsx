import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePiedroAdminPage } from '@/lib/admin/scope'

export default async function AdminCompaniesPage() {
  await requirePiedroAdminPage()
  const t = await getTranslations('admin.companies')

  const service = createServiceClient()

  const { data: companyRows } = await service
    .from('companies').select('id, name, erp_code, exclusive_label').order('name')
  const companies = (companyRows ?? []) as
    { id: string; name: string; erp_code: string; exclusive_label: string | null }[]

  // Distinct siglas present in the catalogue → set of models carrying them.
  const siglaModels = new Map<string, Set<string>>()
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service
      .from('products').select('style_name, exclusive').range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    for (const r of data) {
      const sigla = ((r.exclusive as string | null) ?? '').trim().toUpperCase()
      const style = r.style_name as string | null
      if (!sigla || !style) continue
      if (!siglaModels.has(sigla)) siglaModels.set(sigla, new Set())
      siglaModels.get(sigla)!.add(style)
    }
    if (data.length < PAGE) break
    offset += PAGE
  }

  const labelToCompany = new Map<string, string>()
  for (const c of companies) {
    const l = (c.exclusive_label ?? '').trim().toUpperCase()
    if (l) labelToCompany.set(l, c.name)
  }

  const modelCount = (label: string | null) => {
    const l = (label ?? '').trim().toUpperCase()
    return l ? (siglaModels.get(l)?.size ?? 0) : 0
  }

  const reconciliation = [...siglaModels.entries()]
    .map(([sigla, models]) => ({ sigla, count: models.size, company: labelToCompany.get(sigla) ?? null }))
    .sort((a, b) => a.sigla.localeCompare(b.sigla))
  const unassignedCount = reconciliation.filter(r => !r.company).length

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>

      {/* Companies */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-[14px] p-10 text-center text-sm text-stone-400" style={{ boxShadow: 'var(--shadow-card)' }}>
          {t('empty')}
        </div>
      ) : (
        <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <table className="w-full text-sm">
            <thead className="bg-stone-50">
              <tr>
                {[t('col_name'), t('col_erp'), t('col_label'), t('col_models'), ''].map((c, i) =>
                  <th key={i} className="px-4 py-2 text-left text-[11px] font-semibold text-stone-400 uppercase">{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {companies.map(c => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-stone-800">{c.name}</td>
                  <td className="px-4 py-3 text-stone-500">{c.erp_code || '—'}</td>
                  <td className="px-4 py-3">
                    {c.exclusive_label
                      ? <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-mono font-medium text-gold">{c.exclusive_label}</span>
                      : <span className="text-stone-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{modelCount(c.exclusive_label)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/companies/${c.id}`} className="text-sm font-medium text-gold hover:text-gold-dark">{t('manage')}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reconciliation of existing siglas */}
      <div className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('reconcile_title')}</h2>
          {unassignedCount > 0 && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{t('unassigned_n', { n: unassignedCount })}</span>
          )}
        </div>
        <p className="text-sm text-stone-500">{t('reconcile_hint')}</p>
        {reconciliation.length === 0 ? (
          <p className="text-sm text-stone-400">{t('no_siglas')}</p>
        ) : (
          <div className="rounded-lg border border-stone-100 divide-y divide-stone-50">
            {reconciliation.map(r => (
              <div key={r.sigla} className="flex items-center gap-3 px-3 py-2">
                <span className="w-20 font-mono text-sm font-medium text-stone-700">{r.sigla}</span>
                <span className="flex-1 text-xs text-stone-400">{t('models_count', { n: r.count })}</span>
                {r.company
                  ? <span className="text-sm text-stone-600">{r.company}</span>
                  : <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{t('unassigned')}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
