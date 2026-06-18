import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import CompanyExclusiveModels from '@/components/admin/CompanyExclusiveModels'
import CompanyNotifyForm from '@/components/admin/CompanyNotifyForm'
import CompanyCatalogueAccess from '@/components/admin/CompanyCatalogueAccess'
import CompanyMembers, { type Member, type UserOption } from '@/components/admin/CompanyMembers'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params
  await requirePiedroAdminPage()
  const t = await getTranslations('admin.companies')

  const service = createServiceClient()
  const { data: company } = await service
    .from('companies').select('id, name, erp_code, exclusive_label, notify_cc, notify_bcc, sees_general_catalogue').eq('id', id).single()
  if (!company) notFound()

  // The company's siglas live in company_exclusives (N:N). Include any stray
  // legacy `exclusive_label` value so nothing is lost while it's deprecated.
  const { data: ceRows } = await service
    .from('company_exclusives').select('label').eq('company_id', id)
  const siglas = [...new Set([
    ...((ceRows ?? []).map(r => (r.label ?? '').trim().toUpperCase())),
    ...((company.exclusive_label ?? '').trim().toUpperCase() ? [(company.exclusive_label as string).trim().toUpperCase()] : []),
  ].filter(Boolean))].sort()

  // Members of this company (+ admin flag) and all users (for the add picker).
  const { data: memberRows } = await service
    .from('user_companies')
    .select('user_id, is_company_admin, profiles(id, email, full_name)')
    .eq('company_id', id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members: Member[] = (memberRows ?? []).map((r: any) => ({
    id: r.user_id,
    email: r.profiles?.email ?? '',
    full_name: r.profiles?.full_name ?? '',
    is_company_admin: !!r.is_company_admin,
  }))
  const { data: allProfiles } = await service
    .from('profiles').select('id, email, full_name').order('full_name')
  const allUsers: UserOption[] = (allProfiles ?? []).map(p => ({
    id: p.id, email: p.email ?? '', full_name: p.full_name ?? '',
  }))

  // Build per-model (style_name) exclusivity from all product rows. A style is
  // "free" only when NONE of its colour rows carry any sigla.
  const styleSigla = new Map<string, Set<string>>()  // style → siglas (empty set = free)
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service
      .from('products').select('style_name, exclusive').range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    for (const r of data) {
      const style = r.style_name as string | null
      if (!style) continue
      if (!styleSigla.has(style)) styleSigla.set(style, new Set())
      const set = styleSigla.get(style)!
      for (const tok of ((r.exclusive as string | null) ?? '').toUpperCase().match(/[A-Z0-9]+/g) ?? []) set.add(tok)
    }
    if (data.length < PAGE) break
    offset += PAGE
  }

  // Styles assigned per sigla (for this company's siglas) + the free pool.
  const assignedBySigla: Record<string, string[]> = Object.fromEntries(siglas.map(s => [s, []]))
  const freeModels: string[] = []
  for (const [style, set] of styleSigla) {
    if (set.size === 0) { freeModels.push(style); continue }
    for (const s of siglas) if (set.has(s)) assignedBySigla[s].push(style)
  }
  for (const s of siglas) assignedBySigla[s].sort((a, b) => a.localeCompare(b))
  freeModels.sort((a, b) => a.localeCompare(b))

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/companies" className="text-sm text-stone-400 hover:text-stone-700">← {t('title')}</Link>
        <h1 className="text-xl font-bold text-stone-900">{company.name}</h1>
        <span className="text-sm text-stone-400">{company.erp_code}</span>
      </div>
      <CompanyMembers companyId={company.id} members={members} allUsers={allUsers} />
      <CompanyNotifyForm
        companyId={company.id}
        initialCc={company.notify_cc ?? ''}
        initialBcc={company.notify_bcc ?? ''}
      />
      <CompanyCatalogueAccess
        companyId={company.id}
        initial={company.sees_general_catalogue !== false}
      />
      <CompanyExclusiveModels
        companyId={company.id}
        siglas={siglas}
        assignedBySigla={assignedBySigla}
        freeModels={freeModels}
      />
    </div>
  )
}
