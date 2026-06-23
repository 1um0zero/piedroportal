import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireCatalogueWritePage } from '@/lib/admin/scope'
import { BulkImageUpload } from '@/components/admin/ProductImages'

export default async function BulkImagesPage() {
  const scope = await requireCatalogueWritePage()
  const t = await getTranslations('admin.products')

  // All colour_ids (within scope), to validate filename → product matches client-side.
  const service = createServiceClient()
  const ids: string[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service.from('products').select('colour_id, style_name').range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    for (const r of data) {
      if (scope.allModels || scope.canModel(r.style_name as string)) ids.push(r.colour_id as string)
    }
    if (data.length < PAGE) break
    offset += PAGE
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-stone-400 hover:text-stone-700">← {t('title')}</Link>
        <h1 className="text-xl font-bold text-stone-900">{t('bulk_images_title')}</h1>
      </div>
      <BulkImageUpload colourIds={ids} />
    </div>
  )
}
