import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getUserCompanies } from '@/lib/user-companies'
import { isPiedroAdmin } from '@/lib/roles'
import { getStockProducts } from '@/app/actions/stock'
import StockGrid from '@/components/stock/StockGrid'

export const dynamic = 'force-dynamic'

type Company = { id: string; name: string; erp_code: string }

export default async function StockPage() {
  const t = await getTranslations('stock')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = isPiedroAdmin(profile?.role)

  // Resolve which company the order is placed for (same rules as the order form).
  let companies: Company[] = []
  let userCompany: Company | null = null
  if (isAdmin) {
    const { data } = await supabase.from('companies').select('id,name,erp_code').order('name')
    companies = (data ?? []) as Company[]
  } else if (user) {
    const userCompanies = await getUserCompanies(user.id)
    if (userCompanies.length === 1) {
      userCompany = { id: userCompanies[0].id, name: userCompanies[0].name, erp_code: userCompanies[0].erp_code }
    } else if (userCompanies.length > 1) {
      companies = userCompanies.map((uc) => ({ id: uc.id, name: uc.name, erp_code: uc.erp_code }))
    }
  }

  // A non-admin with no company is pending approval and cannot order.
  const canOrder = isAdmin || !!userCompany || companies.length > 0
  const products = await getStockProducts()

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">{t('heading')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('intro')}</p>

      {!canOrder ? (
        <div className="mt-8 rounded-[14px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          {t('pending')}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-8 rounded-[14px] border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-500">
          {t('noProducts')}
        </div>
      ) : (
        <StockGrid
          products={products}
          companies={companies}
          userCompany={userCompany}
          isAdmin={isAdmin}
        />
      )}
    </main>
  )
}
