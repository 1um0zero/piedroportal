import { notFound, redirect } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import ProductForm from '@/components/admin/ProductForm'
import type { Product } from '@/types'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'piedro_admin') redirect('/gallery')

  const service = createServiceClient()
  const { data } = await service.from('products').select('*').eq('id', id).single()
  if (!data) notFound()
  const product = data as unknown as Product

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-sm text-stone-400 hover:text-stone-700">← Products</Link>
        <h1 className="text-xl font-bold text-stone-900">{product.colour_id}</h1>
      </div>
      <ProductForm product={product} />
    </div>
  )
}
