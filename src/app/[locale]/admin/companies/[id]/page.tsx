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

  // Build the Style → Colour catalogue (every colour row + the siglas it carries)
  // so the exclusivity grid can toggle exclusivity per colour, additively.
  const styleMap = new Map<string, { id: string; name: string; tokens: string[] }[]>()
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service
      .from('products').select('colour_id, style_name, color_name, exclusive')
      .order('colour_id').range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    for (const r of data) {
      const style = r.style_name as string | null
      const colourId = r.colour_id as string | null
      if (!style || !colourId) continue
      const tokens = ((r.exclusive as string | null) ?? '').toUpperCase().match(/[A-Z0-9]+/g) ?? []
      if (!styleMap.has(style)) styleMap.set(style, [])
      styleMap.get(style)!.push({ id: colourId, name: (r.color_name as string | null) ?? '', tokens })
    }
    if (data.length < PAGE) break
    offset += PAGE
  }
  const catalogue = [...styleMap.entries()]
    .map(([style, colours]) => ({ style, colours }))
    .sort((a, b) => a.style.localeCompare(b.style))

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
        catalogue={catalogue}
      />
    </div>
  )
}
