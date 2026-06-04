import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import ProductsList, { type ProductRow } from '@/components/admin/ProductsList'

async function guard() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'piedro_admin') redirect('/gallery')
}

const FIELDS = 'id, colour_id, style_name, color_name, section, closure, type, active, picture_name'

export default async function AdminProductsPage() {
  await guard()
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>
        <div className="flex gap-2">
          <Link href="/admin/products/new" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark">{t('new_product')}</Link>
          <Link href="/admin/products/import" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t('import_excel')}</Link>
          <Link href="/admin/products/images" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50">{t('bulk_images')}</Link>
        </div>
      </div>
      <ProductsList products={all} />
    </div>
  )
}
