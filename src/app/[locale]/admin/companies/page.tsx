import { getTranslations } from 'next-intl/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import CompaniesTable, { type CompanyRow } from '@/components/admin/CompaniesTable'

export default async function AdminCompaniesPage() {
  await requirePiedroAdminPage()
  const t = await getTranslations('admin.companies')

  const service = createServiceClient()

  const { data: companyRows } = await service
    .from('companies').select('id, name, erp_code, exclusive_label, notify_cc, notify_bcc').order('name')
  const companies = (companyRows ?? []) as
    { id: string; name: string; erp_code: string; exclusive_label: string | null; notify_cc: string | null; notify_bcc: string | null }[]

  // Members per company (for user count, admin list and search by user name/email).
  type MemberAgg = { count: number; admins: string[]; haystack: string[] }
  const membersByCompany = new Map<string, MemberAgg>()
  let mOffset = 0
  const M_PAGE = 1000
  while (true) {
    const { data, error } = await service
      .from('user_companies')
      .select('company_id, is_company_admin, profiles(full_name, email)')
      .range(mOffset, mOffset + M_PAGE - 1)
    if (error || !data?.length) break
    for (const r of data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prof = (r as any).profiles as { full_name: string | null; email: string | null } | null
      const cid = (r as { company_id: string }).company_id
      const agg = membersByCompany.get(cid) ?? { count: 0, admins: [], haystack: [] }
      agg.count++
      const name = (prof?.full_name ?? '').trim()
      const email = (prof?.email ?? '').trim()
      if (name) agg.haystack.push(name.toLowerCase())
      if (email) agg.haystack.push(email.toLowerCase())
      if ((r as { is_company_admin: boolean }).is_company_admin) agg.admins.push(name || email)
      membersByCompany.set(cid, agg)
    }
    if (data.length < M_PAGE) break
    mOffset += M_PAGE
  }

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

  // Company siglas live in company_exclusives (N:N). A sigla is owned by MANY
  // companies (e.g. ~65 own LIV). Include any stray legacy value as a fallback.
  const siglasByCompany = new Map<string, Set<string>>()
  const companiesBySigla = new Map<string, Set<string>>()
  const addCompanySigla = (companyId: string, sigla: string) => {
    const s = sigla.trim().toUpperCase()
    if (!s) return
    if (!siglasByCompany.has(companyId)) siglasByCompany.set(companyId, new Set())
    siglasByCompany.get(companyId)!.add(s)
    if (!companiesBySigla.has(s)) companiesBySigla.set(s, new Set())
    companiesBySigla.get(s)!.add(companyId)
  }
  const { data: ceRows } = await service.from('company_exclusives').select('company_id, label')
  for (const r of ceRows ?? []) addCompanySigla(r.company_id as string, (r.label as string) ?? '')
  for (const c of companies) for (const tok of (c.exclusive_label ?? '').toUpperCase().match(/[A-Z0-9]+/g) ?? []) addCompanySigla(c.id, tok)

  const reconciliation = [...siglaModels.entries()]
    .map(([sigla, models]) => ({ sigla, count: models.size, companies: companiesBySigla.get(sigla)?.size ?? 0 }))
    .sort((a, b) => a.sigla.localeCompare(b.sigla))
  const unassignedCount = reconciliation.filter(r => r.companies === 0).length

  const rows: CompanyRow[] = companies.map(c => {
    const agg = membersByCompany.get(c.id)
    const cc = c.notify_cc ?? ''
    const bcc = c.notify_bcc ?? ''
    const siglas = [...(siglasByCompany.get(c.id) ?? [])].sort()
    const models = siglas.reduce((n, s) => n + (siglaModels.get(s)?.size ?? 0), 0)
    const search = [c.name, c.erp_code, ...siglas, ...(agg?.haystack ?? [])]
      .filter(Boolean).join(' ').toLowerCase()
    return {
      id: c.id, name: c.name, erp_code: c.erp_code, siglas,
      models,
      userCount: agg?.count ?? 0,
      admins: agg?.admins ?? [],
      cc, bcc, search,
    }
  })

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>

      {/* Companies */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-[14px] p-10 text-center text-sm text-stone-400" style={{ boxShadow: 'var(--shadow-card)' }}>
          {t('empty')}
        </div>
      ) : (
        <CompaniesTable rows={rows} />
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
                {r.companies > 0
                  ? <span className="text-sm text-stone-600">{t('owned_by_n', { n: r.companies })}</span>
                  : <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{t('unassigned')}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
