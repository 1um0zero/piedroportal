import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { nz } from '@/lib/format'

// Reason codes written by scripts/backfill-order-users.mjs
const REASONS = ['no_contact_on_order', 'contact_not_migrated', 'contact_company_mismatch', 'user_not_member', 'unresolved'] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

export default async function UnassignedOrdersPage() {
  await requirePiedroAdminPage()
  const t = await getTranslations('unassignedOrders')

  const service = createServiceClient()
  const { data } = await service
    .from('orders')
    .select('id, piedro_order_id, reference_customer, patient_name, status, created_at, import_note, companies(name, erp_code), products(colour_id, style_name)')
    .is('user_id', null)
    .order('created_at', { ascending: false })
    .limit(2000)

  const rows: Row[] = data ?? []
  const byReason = (code: string) => rows.filter(r => (r.import_note ?? 'unresolved') === code).length

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-stone-800">{t('title')}</h1>
        <Link href="/admin/orders" className="text-sm text-gold hover:underline">← {t('back_to_orders')}</Link>
      </div>
      <p className="text-sm text-stone-500 mb-6">{t('description')}</p>

      {/* Reason summary */}
      <div className="flex flex-wrap gap-3 mb-6">
        {REASONS.map(code => (
          <div key={code} className="bg-white rounded-[14px] px-4 py-3" style={{ boxShadow: 'var(--shadow-card)' }}>
            <p className="text-2xl font-semibold text-stone-800">{nz(byReason(code))}</p>
            <p className="text-xs text-stone-500">{t(`reason_${code}`)}</p>
          </div>
        ))}
        <div className="bg-white rounded-[14px] px-4 py-3 border border-gold/40" style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="text-2xl font-semibold text-gold">{nz(rows.length)}</p>
          <p className="text-xs text-stone-500">{t('total')}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-[14px] p-10 text-center text-stone-500" style={{ boxShadow: 'var(--shadow-card)' }}>
          {t('empty')}
        </div>
      ) : (
        <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-400 border-b border-stone-100">
                <th className="px-4 py-3 font-medium">{t('col_piedro_order')}</th>
                <th className="px-4 py-3 font-medium">{t('col_reference')}</th>
                <th className="px-4 py-3 font-medium">{t('col_company')}</th>
                <th className="px-4 py-3 font-medium">{t('col_model')}</th>
                <th className="px-4 py-3 font-medium">{t('col_patient')}</th>
                <th className="px-4 py-3 font-medium">{t('col_date')}</th>
                <th className="px-4 py-3 font-medium">{t('col_status')}</th>
                <th className="px-4 py-3 font-medium">{t('col_reason')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-stone-50 hover:bg-stone-50/60">
                  <td className="px-4 py-2.5 font-semibold text-stone-700">{r.piedro_order_id || '—'}</td>
                  <td className="px-4 py-2.5 text-stone-600">{r.reference_customer ?? '—'}</td>
                  <td className="px-4 py-2.5 text-stone-600">{r.companies?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-stone-600">{r.products?.colour_id ?? '—'}</td>
                  <td className="px-4 py-2.5 text-stone-600">{r.patient_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-stone-500">{r.created_at?.slice(0, 10) ?? '—'}</td>
                  <td className="px-4 py-2.5 text-stone-500">{r.status ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block rounded-full bg-amber-50 text-amber-700 text-xs px-2.5 py-1">
                      {t(`reason_${r.import_note ?? 'unresolved'}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
