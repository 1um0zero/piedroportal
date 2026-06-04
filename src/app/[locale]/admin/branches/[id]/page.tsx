import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import BranchDetail, { type BranchUser } from '@/components/admin/BranchDetail'
import type { Branch } from '@/types'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function BranchDetailPage({ params }: Props) {
  const { id } = await params
  await requirePiedroAdminPage()
  const t = await getTranslations('admin.branches')

  const service = createServiceClient()

  const { data: branchRow } = await service
    .from('branches').select('id, name, code, sees_full_catalogue').eq('id', id).single()
  if (!branchRow) notFound()
  const branch = branchRow as Branch

  // Assigned models for this branch.
  const { data: bm } = await service.from('branch_models').select('style_name').eq('branch_id', id)
  const assignedModels = (bm ?? []).map(r => r.style_name as string)

  // All distinct catalogue models (style_name), paginated.
  const styleSet = new Set<string>()
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service.from('products').select('style_name').range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    for (const r of data) if (r.style_name) styleSet.add(r.style_name as string)
    if (data.length < PAGE) break
    offset += PAGE
  }
  const allModels = [...styleSet].sort((a, b) => a.localeCompare(b))

  // All users (for staff assignment).
  const { data: profiles } = await service
    .from('profiles').select('id, email, full_name, role, branch_id').order('full_name')
  const users: BranchUser[] = (profiles ?? []).map(p => ({
    id: p.id,
    email: p.email ?? '',
    full_name: p.full_name ?? '',
    role: p.role ?? 'user',
    branch_id: p.branch_id ?? null,
  }))

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/branches" className="text-sm text-stone-400 hover:text-stone-700">← {t('title')}</Link>
        <h1 className="text-xl font-bold text-stone-900">{branch.name}</h1>
      </div>
      <BranchDetail branch={branch} allModels={allModels} assignedModels={assignedModels} users={users} />
    </div>
  )
}
