'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import type { Locale, StockProduct } from '@/types'
import { preloadFilterTranslations, translateFilterValueSync } from '@/lib/filter-translations'
import { submitStockOrderAction } from '@/app/actions/stock'
import { productImageUrl as imageUrl } from '@/lib/products/image-url'

type Company = { id: string; name: string; erp_code: string }
type Props = {
  products: StockProduct[]
  companies: Company[]
  userCompany: Company | null
  isAdmin: boolean
}

const keyOf = (productId: string, size: number) => `${productId}:${size}`

export default function StockGrid({ products, companies, userCompany, isAdmin }: Props) {
  const t = useTranslations('stock')
  const to = useTranslations('order')
  const locale = useLocale() as Locale
  const router = useRouter()

  // cart: "<productId>:<size>" → qty
  const [cart, setCart] = useState<Record<string, number>>({})
  const [companyId, setCompanyId] = useState<string>(userCompany?.id ?? '')
  const [clinician, setClinician] = useState('')
  const [patient, setPatient] = useState('')
  const [reference, setReference] = useState('')
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, forceI18n] = useState(0)

  // Closure/type values are translated from the DB cache; populate it then redraw.
  useEffect(() => { preloadFilterTranslations().then(() => forceI18n((n) => n + 1)) }, [])

  const needsCompanyPick = !userCompany && companies.length > 0

  const totalPairs = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart],
  )

  const add = (productId: string, size: number, cap: number) => {
    setCart((c) => {
      const k = keyOf(productId, size)
      const next = Math.min((c[k] ?? 0) + 1, cap)
      return { ...c, [k]: next }
    })
  }
  const remove = (productId: string, size: number) => {
    setCart((c) => {
      const k = keyOf(productId, size)
      const next = (c[k] ?? 0) - 1
      const copy = { ...c }
      if (next <= 0) delete copy[k]
      else copy[k] = next
      return copy
    })
  }

  const lineCount = (productId: string) =>
    products
      .find((p) => p.id === productId)!
      .sizes.reduce((sum, s) => sum + (cart[keyOf(productId, s.size)] ?? 0), 0)

  async function submit() {
    setError(null)
    if (totalPairs === 0) { setError(t('emptyCart')); return }
    const company = userCompany?.id ?? companyId
    if (!isAdmin && !company) { setError(t('selectCompany')); return }
    if (!reference.trim()) { setError(to('reference')); return }

    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([k, qty]) => {
        const [product_id, size] = k.split(':')
        return { product_id, size: Number(size), qty }
      })

    setSubmitting(true)
    const res = await submitStockOrderAction({
      company_id: company || null,
      locale,
      clinician: clinician.trim() || null,
      patient_name: patient.trim() || null,
      reference_customer: reference.trim(),
      comments: comments.trim() || null,
      items,
    })
    setSubmitting(false)
    if (res.error) { setError(res.error); return }
    router.push('/orders')
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Product list */}
      <div className="space-y-4">
        {products.map((p) => {
          const count = lineCount(p.id)
          return (
            <div
              key={p.id}
              className="flex gap-4 rounded-[14px] border border-gray-200 bg-white p-4"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                {p.picture_name && (
                  <Image src={imageUrl(p.picture_name)} alt={p.style_name} fill className="object-contain" sizes="96px" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {p.colour_id}
                    </div>
                    <div className="text-sm text-gray-500">
                      {p.color_name}
                      {p.closure && <> · {translateFilterValueSync(p.closure, locale)}</>}
                      {p.type && <> · {translateFilterValueSync(p.type, locale)}</>}
                    </div>
                  </div>
                  {count > 0 && (
                    <span className="shrink-0 rounded-full bg-gold/15 px-3 py-1 text-sm font-medium text-gold-dark">
                      {t('lineTotal', { count })}
                    </span>
                  )}
                </div>

                {/* Size chips */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.sizes.map((s) => {
                    const qty = cart[keyOf(p.id, s.size)] ?? 0
                    const atCap = qty >= s.available
                    return (
                      <div
                        key={s.size}
                        className={`flex items-center overflow-hidden rounded-lg border ${
                          qty > 0 ? 'border-gold bg-gold/10' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {qty > 0 && (
                          <button
                            type="button"
                            onClick={() => remove(p.id, s.size)}
                            aria-label={t('remove')}
                            className="px-2 py-1.5 text-gray-500 hover:bg-gray-100"
                          >
                            −
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => add(p.id, s.size, s.available)}
                          disabled={atCap}
                          title={atCap ? t('limited', { max: s.available }) : undefined}
                          className={`px-3 py-1.5 text-sm font-medium tabular-nums ${
                            atCap ? 'cursor-not-allowed text-gray-400' : 'text-gray-800 hover:bg-gold/15'
                          }`}
                        >
                          {s.size}
                          {qty > 0 && <span className="ml-1.5 text-gold-dark">×{qty}</span>}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart / submit */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-[14px] border border-gray-200 bg-white p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="text-lg font-semibold text-gray-900">
            {t('totalPairs', { count: totalPairs })}
          </div>

          {/* Client: dropdown when there's a choice, otherwise the fixed name. */}
          {(isAdmin || needsCompanyPick) ? (
            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{to('customer')}</span>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">{t('selectCompany')}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          ) : userCompany ? (
            <div className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{to('customer')}</span>
              <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{userCompany.name}</p>
            </div>
          ) : null}

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{to('clinician')}</span>
            <input
              value={clinician}
              onChange={(e) => setClinician(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{to('patient')}</span>
            <input
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {to('reference')} <span className="text-gold">*</span>
            </span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('comments')}</span>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              placeholder={t('commentsPlaceholder')}
              className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex items-center gap-3">
            {totalPairs > 0 && (
              <button
                type="button"
                onClick={() => setCart({})}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {t('clear')}
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={submitting || totalPairs === 0}
              className="ml-auto rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-50"
            >
              {submitting ? t('submitting') : t('submit')}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
