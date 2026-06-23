import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { requireCatalogueWritePage } from '@/lib/admin/scope'
import ProductImport from '@/components/admin/ProductImport'

export default async function ImportProductsPage() {
  await requireCatalogueWritePage()
  const t = await getTranslations('admin.products')

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-stone-400 hover:text-stone-700">← {t('title')}</Link>
        <h1 className="text-xl font-bold text-stone-900">{t('import_title')}</h1>
      </div>
      <ProductImport />
    </div>
  )
}
