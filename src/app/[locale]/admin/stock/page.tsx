import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { getStockAdminRows } from '@/app/actions/admin-stock'
import StockAdmin from '@/components/admin/StockAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminStockPage() {
  await requirePiedroAdminPage()
  const t = await getTranslations('admin.stock')
  const rows = await getStockAdminRows()

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-stone-500">{t('intro')}</p>
        </div>
        <Link href="/stock" className="shrink-0 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark">
          {t('order_link')} →
        </Link>
      </div>
      <StockAdmin initialRows={rows} />
    </div>
  )
}
