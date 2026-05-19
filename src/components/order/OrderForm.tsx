'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`

type Unit = 'PAIR' | 'LEFT' | 'RIGHT' | 'LEFT_RIGHT'

type Profile = { company_id: string | null; full_name: string | null; role: string }
type Props   = { product: Product; userId: string; userProfile: Profile }

// ── Single-select chip components ─────────────────────────────────────────────

function SquareChips({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button"
          onClick={() => onChange(o === value ? '' : o)}
          className={`px-3 py-1.5 text-xs font-medium rounded border transition-all duration-150
            ${o === value
              ? 'bg-gold text-white border-gold shadow-sm'
              : 'text-stone-600 border-stone-200 bg-white hover:border-gold/60 hover:text-gold'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

function PillChips({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button"
          onClick={() => onChange(o === value ? '' : o)}
          className={`w-10 h-10 text-xs font-semibold rounded-full border transition-all duration-150
            ${o === value
              ? 'bg-gold text-white border-gold shadow-sm'
              : 'text-stone-600 border-stone-200 bg-white hover:border-gold/60 hover:text-gold'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

function SizeChips({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button"
          onClick={() => onChange(o === value ? '' : o)}
          className={`min-w-[2.75rem] h-9 px-2 text-xs font-medium rounded border transition-all duration-150
            ${o === value
              ? 'bg-gold text-white border-gold shadow-sm'
              : 'text-stone-600 border-stone-200 bg-white hover:border-gold/60 hover:text-gold'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

// ── Sided section (Left | Right) ──────────────────────────────────────────────

function SidedSection({
  title, showLeft, showRight, mirror,
  leftContent, rightContent,
}: {
  title: string
  showLeft: boolean
  showRight: boolean
  mirror: boolean
  leftContent: React.ReactNode
  rightContent: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider
                     border-b border-stone-100 pb-2">{title}</h2>
      <div className={`grid gap-6 ${showLeft && showRight ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {showLeft && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              Left <span className="text-red-400">*</span>
            </p>
            {leftContent}
          </div>
        )}
        {showRight && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              Right <span className="text-red-400">*</span>
              {mirror && <span className="text-stone-400 normal-case font-normal ml-1.5">= Left</span>}
            </p>
            {mirror
              ? <div className="opacity-50 pointer-events-none">{leftContent}</div>
              : rightContent}
          </div>
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrderForm({ product, userId, userProfile }: Props) {
  const t      = useTranslations('order')
  const router = useRouter()

  const companyId = userProfile.company_id

  const [unit, setUnit]               = useState<Unit>('PAIR')
  const [clinician, setClinician]     = useState('')
  const [patientName, setPatientName] = useState('')
  const [reference, setReference]     = useState('')
  const [quantity, setQuantity]       = useState(1)
  const [constrLeft, setConstrLeft]   = useState('')
  const [constrRight, setConstrRight] = useState('')
  const [widthLeft, setWidthLeft]     = useState('')
  const [widthRight, setWidthRight]   = useState('')
  const [sizeLeft, setSizeLeft]       = useState('')
  const [sizeRight, setSizeRight]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  const showLeft  = unit !== 'RIGHT'
  const showRight = unit !== 'LEFT'
  const mirror    = unit === 'PAIR'

  const constructions = product.constructions ?? []
  const constructionOpts = constructions.map((c) => c.construction)

  // Widths available depend on selected construction (left foot drives it)
  const widthsForLeft  = constrLeft
    ? (constructions.find((c) => c.construction === constrLeft)?.widths ?? [])
    : [...new Set(constructions.flatMap((c) => c.widths))]
  const widthsForRight = (mirror ? constrLeft : constrRight)
    ? (constructions.find((c) => c.construction === (mirror ? constrLeft : constrRight))?.widths ?? [])
    : [...new Set(constructions.flatMap((c) => c.widths))]

  const sizes: string[] = []
  for (let s = product.size_first; s <= product.size_last; s += 0.5) {
    sizes.push(String(Math.round(s * 2) / 2))
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
      construction_left:  constrLeft || null,
      construction_right: mirror ? constrLeft || null : constrRight || null,
      width_left:         widthLeft || null,
      width_right:        mirror ? widthLeft || null : widthRight || null,
      size_left:          sizeLeft ? parseFloat(sizeLeft) : null,
      size_right:         mirror
        ? (sizeLeft ? parseFloat(sizeLeft) : null)
        : (sizeRight ? parseFloat(sizeRight) : null),
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    router.push('/orders')
  }

  const inputCls = 'w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg ' +
    'focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors'

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-lg font-semibold text-stone-900 mb-6">{t('title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">

        {/* ── Form ─────────────────────────────────────────────────── */}
        <div className="space-y-8">

          {/* Customer */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider
                           border-b border-stone-100 pb-2">Customer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Clinician', val: clinician, set: setClinician, required: false },
                { label: 'Patient Name or number', val: patientName, set: setPatientName, required: false },
                { label: 'Reference customer', val: reference, set: setReference, required: true },
              ].map(({ label, val, set, required }) => (
                <div key={label} className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <input className={inputCls} value={val} onChange={(e) => set(e.target.value)} />
                </div>
              ))}

              {/* Unit — square chips */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Unit <span className="text-red-400">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {([
                    ['PAIR',       'Pair (L = R)'],
                    ['LEFT',       'Left only'],
                    ['RIGHT',      'Right only'],
                    ['LEFT_RIGHT', 'Left ≠ Right'],
                  ] as [Unit, string][]).map(([val, lbl]) => (
                    <button key={val} type="button"
                      onClick={() => setUnit(val)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all
                        ${unit === val
                          ? 'bg-gold text-white border-gold shadow-sm'
                          : 'border-stone-200 text-stone-600 hover:border-gold/60 hover:text-gold'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Quantity <span className="text-red-400">*</span>
                </label>
                <input type="number" min={1} className={inputCls} value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
            </div>
          </section>

          {/* Construction */}
          {constructionOpts.length > 0 && (
            <SidedSection
              title="Construction style"
              showLeft={showLeft} showRight={showRight} mirror={mirror}
              leftContent={
                <SquareChips options={constructionOpts} value={constrLeft}
                  onChange={(v) => { setConstrLeft(v); if (mirror || !widthsForLeft.includes(widthLeft)) setWidthLeft('') }} />
              }
              rightContent={
                <SquareChips options={constructionOpts} value={constrRight}
                  onChange={(v) => { setConstrRight(v); if (!widthsForRight.includes(widthRight)) setWidthRight('') }} />
              }
            />
          )}

          {/* Width */}
          {(widthsForLeft.length > 0 || widthsForRight.length > 0) && (
            <SidedSection
              title="Width"
              showLeft={showLeft} showRight={showRight} mirror={mirror}
              leftContent={<PillChips options={widthsForLeft} value={widthLeft} onChange={setWidthLeft} />}
              rightContent={<PillChips options={widthsForRight} value={widthRight} onChange={setWidthRight} />}
            />
          )}

          {/* Size */}
          <SidedSection
            title={`Size — EU (${product.size_first}–${product.size_last})`}
            showLeft={showLeft} showRight={showRight} mirror={mirror}
            leftContent={<SizeChips options={sizes} value={sizeLeft} onChange={setSizeLeft} />}
            rightContent={<SizeChips options={sizes} value={sizeRight} onChange={setSizeRight} />}
          />

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
            <button onClick={() => handleSubmit('submitted')}
              disabled={submitting || !reference}
              className="px-6 py-2.5 bg-gold text-white font-semibold text-sm rounded-xl
                         hover:bg-gold-dark transition-colors disabled:opacity-50">
              {t('submit')}
            </button>
            <button onClick={() => handleSubmit('draft')}
              disabled={submitting}
              className="px-6 py-2.5 border border-stone-200 text-stone-600 font-medium
                         text-sm rounded-xl hover:border-stone-300 transition-colors">
              {t('save_draft')}
            </button>
          </div>
        </div>

        {/* ── Product sidebar ───────────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider
                         border-b border-stone-100 pb-2">Product</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">Style</p>
              <p className="font-semibold text-stone-800">{product.style_name}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">Model</p>
              <p className="font-medium text-stone-700">{product.colour_id}</p>
              <p className="text-stone-500 text-xs">{product.color_name}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">Closure</p>
              <p className="text-gold font-medium">{product.closure}</p>
            </div>
          </div>
          {product.picture_name && (
            <div className="relative aspect-square rounded-xl overflow-hidden bg-stone-50"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <Image src={`${BUCKET}/${product.picture_name}`} alt={product.style_name}
                fill sizes="280px" className="object-contain p-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
