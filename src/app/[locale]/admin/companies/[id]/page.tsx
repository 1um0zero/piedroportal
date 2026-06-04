import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import CompanyExclusiveModels from '@/components/admin/CompanyExclusiveModels'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params
  await requirePiedroAdminPage()
  const t = await getTranslations('admin.companies')

  const service = createServiceClient()
  const { data: company } = await service
    .from('companies').select('id, name, erp_code, exclusive_label').eq('id', id).single()
  if (!company) notFound()

  const label = (company.exclusive_label ?? '').trim().toUpperCase()

  // Build per-model (style_name) exclusivity from all product rows.
  const styleSigla = new Map<string, string>()  // style → sigla ('' = free)
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service
      .from('products').select('style_name, exclusive').range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    for (const r of data) {
      const style = r.style_name as string | null
      if (!style) continue
      const sigla = ((r.exclusive as string | null) ?? '').trim().toUpperCase()
      // A style counts as exclusive if ANY of its colour rows carries a sigla.
      if (sigla) styleSigla.set(style, sigla)
      else if (!styleSigla.has(style)) styleSigla.set(style, '')
    }
    if (data.length < PAGE) break
    offset += PAGE
  }

  const assignedModels: string[] = []
  const freeModels: string[] = []
  for (const [style, sigla] of styleSigla) {
    if (label && sigla === label) assignedModels.push(style)
    else if (!sigla) freeModels.push(style)
    // styles owned by another company's sigla are intentionally hidden here.
  }
  assignedModels.sort((a, b) => a.localeCompare(b))
  freeModels.sort((a, b) => a.localeCompare(b))

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/companies" className="text-sm text-stone-400 hover:text-stone-700">← {t('title')}</Link>
        <h1 className="text-xl font-bold text-stone-900">{company.name}</h1>
        <span className="text-sm text-stone-400">{company.erp_code}</span>
      </div>
      <CompanyExclusiveModels
        company={company}
        assignedModels={assignedModels}
        freeModels={freeModels}
      />
    </div>
  )
}
