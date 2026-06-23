import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireCatalogueWritePage } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import ProductForm, { type ExclusiveCompany } from '@/components/admin/ProductForm'
import type { Product } from '@/types'

/** Companies that can own exclusive models (piedro_admin only). */
async function getExclusiveCompanies(): Promise<ExclusiveCompany[]> {
  const service = createServiceClient()
  const { data } = await service
    .from('companies')
    .select('id, name, exclusive_label')
    .not('exclusive_label', 'is', null)
    .neq('exclusive_label', '')
    .order('name')
  return (data ?? []) as ExclusiveCompany[]
}

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const scope = await requireCatalogueWritePage()

  const service = createServiceClient()
  const { data } = await service.from('products').select('*').eq('id', id).single()
  if (!data) notFound()
  const product = data as unknown as Product

  // Branch staff cannot open a model outside their scope.
  if (!scope.canModel(product.style_name)) redirect('/admin/products')
  const t = await getTranslations('admin.products')

  const companies = isPiedroAdmin(scope.role) ? await getExclusiveCompanies() : undefined

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-stone-400 hover:text-stone-700">← {t('title')}</Link>
        <h1 className="text-xl font-bold text-stone-900">{product.colour_id}</h1>
      </div>
      <ProductForm product={product} companies={companies} />
    </div>
  )
}
