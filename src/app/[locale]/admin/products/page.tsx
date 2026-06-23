import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireBackofficePage } from '@/lib/admin/scope'
import ProductsList, { type ProductRow } from '@/components/admin/ProductsList'

const FIELDS = 'id, colour_id, style_name, color_name, section, closure, type, active, picture_name, exclusive, is_stock, is_new, diabetics, created_at'

export default async function AdminProductsPage() {
  const scope = await requireBackofficePage()
  const t = await getTranslations('admin.products')

  const service = createServiceClient()
  const all: ProductRow[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service
      .from('products').select(FIELDS)
      .order('colour_id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    all.push(...(data as unknown as ProductRow[]))
    if (data.length < PAGE) break
    offset += PAGE
  }

  // Map exclusive sigla → company name (products.exclusive matches companies.exclusive_label).
  const { data: companies } = await service
    .from('companies').select('name, exclusive_label').not('exclusive_label', 'is', null)
  const companyByLabel: Record<string, string> = {}
  for (const c of companies ?? []) {
    const label = (c.exclusive_label ?? '').trim().toUpperCase()
    if (label) companyByLabel[label] = c.name
  }

  // Branch staff only see/manage models within their scope.
  const visible = scope.allModels ? all : all.filter(p => scope.canModel(p.style_name))

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>
        <div className="flex gap-2">
          {!scope.readonlyCatalogue && (
            <Link href="/admin/products/new" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark">{t('new_product')}</Link>
          )}
          <a href="/api/admin/products/export" download className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t('export_excel')}</a>
          {!scope.readonlyCatalogue && (
            <>
              <Link href="/admin/products/import" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t('import_excel')}</Link>
              <Link href="/admin/products/images" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t('bulk_images')}</Link>
              <Link href="/admin/products/order" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t('gallery_order')}</Link>
            </>
          )}
        </div>
      </div>
      <ProductsList products={visible} companyByLabel={companyByLabel} />
    </div>
  )
}
