import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { exclusiveTokens } from '@/lib/exclusive'
import BranchDetail, { type BranchUser, type BranchCompanyOption } from '@/components/admin/BranchDetail'
import type { GridStyle } from '@/components/admin/BranchExclusiveGrid'
import type { Branch } from '@/types'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function BranchDetailPage({ params }: Props) {
  const { id } = await params
  await requirePiedroAdminPage()
  const t = await getTranslations('admin.branches')

  const service = createServiceClient()

  const { data: branchRow } = await service
    .from('branches').select('id, name, code, sees_full_catalogue, handles_unassigned_clients, exclusive_label, notify_email, notify_locale').eq('id', id).single()
  if (!branchRow) notFound()
  const branch = branchRow as Branch
  const token = (branch.exclusive_label ?? '').trim().toUpperCase() || null

  // Assigned models for this branch (legacy branch_models — token branches don't use it).
  const { data: bm } = await service.from('branch_models').select('style_name').eq('branch_id', id)
  const assignedModels = (bm ?? []).map(r => r.style_name as string)

  // All catalogue rows. For a token-scoped branch we need every Style.Colour and
  // its current exclusivity (the grid); otherwise just distinct style_names.
  const styleSet = new Set<string>()
  const byStyle = new Map<string, GridStyle>()
  let offset = 0
  const PAGE = 1000
  while (true) {
    const sel = token ? 'style_name, colour_id, color_name, exclusive' : 'style_name'
    const { data, error } = await service.from('products').select(sel).range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    for (const r of data as unknown as { style_name: string | null; colour_id?: string; color_name?: string | null; exclusive?: string | null }[]) {
      if (!r.style_name) continue
      styleSet.add(r.style_name)
      if (token && r.colour_id) {
        let s = byStyle.get(r.style_name)
        if (!s) { s = { style: r.style_name, colours: [] }; byStyle.set(r.style_name, s) }
        s.colours.push({ id: r.colour_id, name: r.color_name ?? '', on: exclusiveTokens(r.exclusive).includes(token) })
      }
    }
    if (data.length < PAGE) break
    offset += PAGE
  }
  const allModels = [...styleSet].sort((a, b) => a.localeCompare(b))
  const gridStyles: GridStyle[] = token
    ? [...byStyle.values()]
        .map(s => ({ ...s, colours: s.colours.sort((a, b) => a.id.localeCompare(b.id)) }))
        .sort((a, b) => a.style.localeCompare(b.style))
    : []

  // All users (for staff + branch-admin assignment).
  const { data: profiles } = await service
    .from('profiles').select('id, email, full_name, role, branch_id').order('full_name')
  const users: BranchUser[] = (profiles ?? []).map(p => ({
    id: p.id,
    email: p.email ?? '',
    full_name: p.full_name ?? '',
    role: p.role ?? 'user',
    branch_id: p.branch_id ?? null,
  }))

  // Clients (companies) linked to this branch + the full company list to pick from.
  const [{ data: allCompaniesRows }, { data: bc }, { data: ba }] = await Promise.all([
    service.from('companies').select('id, name, erp_code, exclusive_label').order('name'),
    service.from('branch_companies').select('company_id').eq('branch_id', id),
    service.from('branch_admins').select('user_id').eq('branch_id', id),
  ])
  const allCompanies: BranchCompanyOption[] = (allCompaniesRows ?? []).map(c => ({
    id: c.id, name: c.name ?? '', erp_code: c.erp_code ?? '',
  }))
  const assignedCompanyIds = (bc ?? []).map(r => r.company_id as string)
  const branchAdminIds = (ba ?? []).map(r => r.user_id as string)
  // Token-scoped branch: clients = companies carrying the branch sigla.
  const exclusiveClientIds = token
    ? (allCompaniesRows ?? []).filter(c => exclusiveTokens(c.exclusive_label).includes(token)).map(c => c.id)
    : []

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/branches" className="text-sm text-stone-400 hover:text-stone-700">← {t('title')}</Link>
        <h1 className="text-xl font-bold text-stone-900">{branch.name}</h1>
      </div>
      <BranchDetail branch={branch} allModels={allModels} assignedModels={assignedModels} users={users}
        allCompanies={allCompanies} assignedCompanyIds={assignedCompanyIds} branchAdminIds={branchAdminIds}
        exclusiveToken={token} gridStyles={gridStyles} exclusiveClientIds={exclusiveClientIds} />
    </div>
  )
}
