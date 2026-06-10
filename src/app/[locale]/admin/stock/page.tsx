import { getTranslations } from 'next-intl/server'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { getStockAdminRows } from '@/app/actions/admin-stock'
import StockAdmin from '@/components/admin/StockAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminStockPage() {
  await requirePiedroAdminPage()
  const t = await getTranslations('admin.stock')
  const rows = await getStockAdminRows()

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-stone-500">{t('intro')}</p>
      </div>
      <StockAdmin initialRows={rows} />
    </div>
  )
}
