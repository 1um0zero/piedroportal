'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import type { StockOrderDetail } from '@/app/actions/stock'
import { updateStockOrderStatusAction } from '@/app/actions/stock'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const imageUrl = (name: string) => `${SUPABASE_URL}/storage/v1/object/public/products/${name}?v=2`

const STATUSES = ['submitted', 'approved', 'in_production', 'shipped', 'delivered', 'cancelled'] as const

export default function StockOrderDetailView({ order, isAdmin }: { order: StockOrderDetail; isAdmin: boolean }) {
  const t = useTranslations('stock')
  const to = useTranslations('order')
  const ts = useTranslations('dashboard.status')
  const locale = useLocale()
  const router = useRouter()

  const [status, setStatus] = useState(order.status)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const totalPairs = order.items.reduce((s, i) => s + i.qty, 0)
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  async function save() {
    setSaving(true); setSaved(false)
    const res = await updateStockOrderStatusAction(order.id, status)
    setSaving(false)
    if (!res.error) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 1500) }
    else alert(res.error)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <Link href={isAdmin ? '/admin/orders' : '/orders'} className="text-sm text-stone-500 hover:text-stone-800">← {t('back')}</Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t('detailTitle')}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {t('placed')}: {fmtDate(order.created_at)}
            {order.company && <> · {order.company.name}</>}
          </p>
          {order.expected_dispatch_date && (
            <p className="text-sm text-stone-500">{t('dispatchExpected')}: {fmtDate(order.expected_dispatch_date)}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {!isAdmin && (
            <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600">
              {ts.has(order.status) ? ts(order.status) : order.status}
            </span>
          )}
          {order.pdf_url && (
            <a href={order.pdf_url} target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium text-gold hover:text-gold-dark">PDF ↗</a>
          )}
        </div>
      </div>

      {/* Customer */}
      <div className="rounded-[14px] border border-stone-200 bg-white p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-400">{to('customer')}</p>
          <p className="text-stone-800">{order.company?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-400">{to('clinician')}</p>
          <p className="text-stone-800">{order.clinician || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-400">{to('patient')}</p>
          <p className="text-stone-800">{order.patient_name || '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-400">{to('reference')}</p>
          <p className="text-stone-800">{order.reference_customer || '—'}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-3 rounded-[14px] border border-stone-200 bg-white p-4">
          <label className="text-sm text-stone-600">{t('status')}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{ts.has(s) ? ts(s) : s}</option>)}
          </select>
          <button onClick={save} disabled={saving || status === order.status}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-50">
            {t('updateStatus')}
          </button>
          {saved && <span className="text-xs text-green-600">{t('statusSaved')}</span>}
        </div>
      )}

      {/* Items */}
      <div className="rounded-[14px] border border-stone-200 bg-white overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full text-sm">
          <thead className="border-b border-stone-100 text-xs text-stone-400 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">{t('model')}</th>
              <th className="px-4 py-3 text-left">{t('sizeCol')}</th>
              <th className="px-4 py-3 text-right">{t('qtyCol')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-50">
                      {i.product?.picture_name && (
                        <Image src={imageUrl(i.product.picture_name)} alt="" fill className="object-contain p-0.5" sizes="40px" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">
                        {i.product ? `${i.product.style_name}.${i.product.colour_id}` : '—'}
                      </p>
                      <p className="text-xs text-stone-400">{i.product?.color_name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-stone-700">{i.size}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-stone-800">{i.qty}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-stone-100">
            <tr>
              <td className="px-4 py-3 font-medium text-stone-600" colSpan={2}>{t('totalPairs2')}</td>
              <td className="px-4 py-3 text-right font-bold text-stone-900 tabular-nums">{totalPairs}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.comments && (
        <div className="rounded-[14px] border border-stone-200 bg-white p-4 text-sm text-stone-700">
          {order.comments}
        </div>
      )}
    </div>
  )
}
