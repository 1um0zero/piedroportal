'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`

type Unit = 'PAIR' | 'LEFT' | 'RIGHT' | 'LEFT_RIGHT'

type Profile = {
  company_id: string | null
  full_name: string | null
  role: string
}

type Props = {
  product: Product
  userId: string
  userProfile: Profile
}

export default function OrderForm({ product, userId, userProfile }: Props) {
  const t  = useTranslations('order')
  const router = useRouter()

  const isAdmin  = userProfile.role === 'piedro_admin'
  const companyId = userProfile.company_id

  // Form state
  const [unit, setUnit]                   = useState<Unit>('PAIR')
  const [clinician, setClinician]         = useState('')
  const [patientName, setPatientName]     = useState('')
  const [reference, setReference]         = useState('')
  const [quantity, setQuantity]           = useState(1)
  const [constructionLeft, setConstrLeft] = useState('')
  const [constructionRight, setConstrRight] = useState('')
  const [widthLeft, setWidthLeft]         = useState('')
  const [widthRight, setWidthRight]       = useState('')
  const [sizeLeft, setSizeLeft]           = useState('')
  const [sizeRight, setSizeRight]         = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')

  // Derived: which sides are active
  const showLeft  = unit !== 'RIGHT'
  const showRight = unit !== 'LEFT'
  const mirrorRight = unit === 'PAIR'   // PAIR mirrors left → right

  // Constructions and widths from product
  const constructions = product.constructions ?? []
  const allWidths = [...new Set(constructions.flatMap((c) => c.widths))].sort()

  // Size range for the product
  const sizeMin = product.size_first
  const sizeMax = product.size_last
  const sizes: number[] = []
  for (let s = sizeMin; s <= sizeMax; s += 0.5) {
    sizes.push(Math.round(s * 2) / 2)
  }

  async function handleSubmit(status: 'draft' | 'submitted') {
    setError('')
    setSubmitting(true)

    const sb = createClient()
    const { error: err } = await sb.from('orders').insert({
      user_id:            userId,
      company_id:         companyId,
      product_id:         product.id,
      status,
      unit,
      clinician:          clinician || null,
      patient_name:       patientName || null,
      reference_customer: reference || null,
      quantity,
      construction_left:  constructionLeft || null,
      construction_right: mirrorRight ? constructionLeft || null : constructionRight || null,
      width_left:         widthLeft || null,
      width_right:        mirrorRight ? widthLeft || null : widthRight || null,
      size_left:          sizeLeft ? parseFloat(sizeLeft) : null,
      size_right:         mirrorRight
        ? (sizeLeft ? parseFloat(sizeLeft) : null)
        : (sizeRight ? parseFloat(sizeRight) : null),
    })

    setSubmitting(false)
    if (err) { setError(err.message); return }
    router.push('/orders')
  }

  const inputClass = 'w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg ' +
    'focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors'
  const selectClass = inputClass + ' appearance-none cursor-pointer'
  const labelClass  = 'text-xs font-semibold text-stone-500 uppercase tracking-wide'

  function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
      <div className="space-y-1.5">
        <label className={labelClass}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
        {children}
      </div>
    )
  }

  function SidedFields({
    label,
    leftVal, setLeft,
    rightVal, setRight,
    options,
  }: {
    label: string
    leftVal: string; setLeft: (v: string) => void
    rightVal: string; setRight: (v: string) => void
    options: string[]
  }) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-stone-700">{label}</p>
        <div className="grid grid-cols-2 gap-3">
          {showLeft && (
            <div className="space-y-1">
              <label className={labelClass}>Left{!showRight ? '' : ''} <span className="text-red-400">*</span></label>
              <select className={selectClass} value={leftVal} onChange={(e) => setLeft(e.target.value)}>
                <option value="">—</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
          {showRight && (
            <div className="space-y-1">
              <label className={labelClass}>
                Right <span className="text-red-400">*</span>
                {mirrorRight && <span className="text-stone-400 normal-case font-normal ml-1">(= Left)</span>}
              </label>
              <select
                className={selectClass}
                value={mirrorRight ? leftVal : rightVal}
                onChange={(e) => setRight(e.target.value)}
                disabled={mirrorRight}
              >
                <option value="">—</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-lg font-semibold text-stone-900 mb-6">{t('title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">

        {/* ── LEFT: Form ───────────────────────────────────────────── */}
        <div className="space-y-8">

          {/* Customer section */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider
                           border-b border-stone-100 pb-2">Customer</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Clinician">
                <input className={inputClass} value={clinician}
                  onChange={(e) => setClinician(e.target.value)} />
              </FieldRow>

              <FieldRow label="Patient Name or number">
                <input className={inputClass} value={patientName}
                  onChange={(e) => setPatientName(e.target.value)} />
              </FieldRow>

              <FieldRow label="Reference customer" required>
                <input className={inputClass} value={reference}
                  onChange={(e) => setReference(e.target.value)} required />
              </FieldRow>

              <FieldRow label="Unit" required>
                <div className="relative">
                  <select className={selectClass} value={unit}
                    onChange={(e) => setUnit(e.target.value as Unit)}>
                    <option value="PAIR">PAIR</option>
                    <option value="LEFT">LEFT</option>
                    <option value="RIGHT">RIGHT</option>
                    <option value="LEFT_RIGHT">LEFT different from RIGHT</option>
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </FieldRow>

              <FieldRow label="Quantity" required>
                <input type="number" min={1} className={inputClass} value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
              </FieldRow>
            </div>
          </section>

          {/* Construction Style */}
          {constructions.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider
                             border-b border-stone-100 pb-2">Construction style</h2>
              <SidedFields
                label=""
                leftVal={constructionLeft} setLeft={setConstrLeft}
                rightVal={constructionRight} setRight={setConstrRight}
                options={constructions.map((c) => c.construction)}
              />
            </section>
          )}

          {/* Width */}
          {allWidths.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider
                             border-b border-stone-100 pb-2">Width</h2>
              <SidedFields
                label=""
                leftVal={widthLeft} setLeft={setWidthLeft}
                rightVal={widthRight} setRight={setWidthRight}
                options={allWidths}
              />
            </section>
          )}

          {/* Size */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider
                           border-b border-stone-100 pb-2">
              Size
              <span className="ml-2 text-gold font-normal normal-case text-xs">
                EU ({sizeMin}–{sizeMax})
              </span>
            </h2>
            <SidedFields
              label=""
              leftVal={sizeLeft} setLeft={setSizeLeft}
              rightVal={sizeRight} setRight={setSizeRight}
              options={sizes.map(String)}
            />
          </section>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleSubmit('submitted')}
              disabled={submitting || !reference}
              className="px-6 py-2.5 bg-gold text-white font-semibold text-sm rounded-xl
                         hover:bg-gold-dark transition-colors disabled:opacity-50"
            >
              {t('submit')}
            </button>
            <button
              onClick={() => handleSubmit('draft')}
              disabled={submitting}
              className="px-6 py-2.5 border border-stone-200 text-stone-600 font-medium
                         text-sm rounded-xl hover:border-stone-300 transition-colors"
            >
              {t('save_draft')}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Product info ───────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider
                         border-b border-stone-100 pb-2">Product</h2>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-stone-400 text-xs uppercase tracking-wide">Style</span>
              <p className="font-semibold text-stone-800">{product.style_name}</p>
            </div>
            <div>
              <span className="text-stone-400 text-xs uppercase tracking-wide">Model</span>
              <p className="font-medium text-stone-700">{product.colour_id}</p>
              <p className="text-stone-500 text-xs">{product.color_name}</p>
            </div>
            <div>
              <span className="text-stone-400 text-xs uppercase tracking-wide">Closure</span>
              <p className="text-gold font-medium">{product.closure}</p>
            </div>
          </div>

          {product.picture_name && (
            <div className="relative aspect-square bg-stone-50 rounded-xl overflow-hidden"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <Image
                src={`${BUCKET}/${product.picture_name}`}
                alt={product.style_name}
                fill sizes="280px"
                className="object-contain p-3"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
