import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireBackofficePage } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import ProductForm, { type ExclusiveCompany } from '@/components/admin/ProductForm'

export default async function NewProductPage() {
  const scope = await requireBackofficePage()
  const t = await getTranslations('admin.products')

  let companies: ExclusiveCompany[] | undefined
  if (isPiedroAdmin(scope.role)) {
    const service = createServiceClient()
    const { data } = await service
      .from('companies')
      .select('id, name, exclusive_label')
      .not('exclusive_label', 'is', null)
      .neq('exclusive_label', '')
      .order('name')
    companies = (data ?? []) as ExclusiveCompany[]
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-stone-400 hover:text-stone-700">← {t('title')}</Link>
        <h1 className="text-xl font-bold text-stone-900">{t('new_product')}</h1>
      </div>
      <ProductForm companies={companies} />
    </div>
  )
}
