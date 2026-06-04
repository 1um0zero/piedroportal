import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireBackofficePage } from '@/lib/admin/scope'
import ProductForm from '@/components/admin/ProductForm'
import type { Product } from '@/types'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const scope = await requireBackofficePage()

  const service = createServiceClient()
  const { data } = await service.from('products').select('*').eq('id', id).single()
  if (!data) notFound()
  const product = data as unknown as Product

  // Branch staff cannot open a model outside their scope.
  if (!scope.canModel(product.style_name)) redirect('/admin/products')
  const t = await getTranslations('admin.products')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-stone-400 hover:text-stone-700">← {t('title')}</Link>
        <h1 className="text-xl font-bold text-stone-900">{product.colour_id}</h1>
      </div>
      <ProductForm product={product} />
    </div>
  )
}
