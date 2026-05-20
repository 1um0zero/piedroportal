'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`

type Unit    = 'PAIR' | 'LEFT' | 'RIGHT' | 'LEFT_RIGHT' | 'DIFF_SIZES'
type Company = { id: string; name: string; erp_code: string }
type Profile = { company_id: string | null; full_name: string | null; role: string }

type Props = {
  product:     Product
  userId:      string
  userProfile: Profile
  userCompany: Company | null   // user's own company (null if admin)
  companies:   Company[]        // all companies (admin only)
  isAdmin:     boolean
}

// ── Single-select chip ────────────────────────────────────────────────────────
function Chips({ options, value, onChange, pill = false }: {
  options: string[]
  value: string
  onChange: (v: string) => void
  pill?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o === value ? '' : o)}
          className={`px-2.5 py-1 text-xs font-medium border transition-all whitespace-nowrap
            ${pill ? 'rounded-full' : 'rounded'}
            ${o === value
              ? 'bg-gold text-white border-gold shadow-sm'
              : 'text-stone-600 border-stone-200 bg-white hover:border-gold/60 hover:text-gold'}`}>
          {o}
        </button>
      ))}
    </div>
  )
}

// ── Size input with datalist ──────────────────────────────────────────────────
function SizeInput({ sizes, value, onChange, label }: {
  sizes: string[]
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const id = `size-list-${label}`
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</p>
      <div className="relative">
        <input
          list={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={e => {
            const v = parseFloat(e.target.value)
            if (isNaN(v)) { onChange(''); return }
            const nearest = sizes.reduce((p, c) =>
              Math.abs(parseFloat(c) - v) < Math.abs(parseFloat(p) - v) ? c : p
            )
            onChange(nearest)
          }}
          placeholder="—"
          className="w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold
                     transition-colors"
        />
        <datalist id={id}>
          {sizes.map(s => <option key={s} value={s} />)}
        </datalist>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function OrderForm({ product, userId, userProfile, userCompany, companies, isAdmin }: Props) {
  const t      = useTranslations('order')
  const locale = useLocale()
  const router = useRouter()

  // ── Form state ──
  const [selectedCompanyId, setCompanyId] = useState(userProfile.company_id ?? '')
  const [unit,        setUnit]      = useState<Unit>('PAIR')
  const [clinician,   setClinician] = useState('')
  const [patientName, setPatient]   = useState('')
  const [reference,   setReference] = useState('')
  const [quantity,    setQuantity]  = useState(1)
  const [constrLeft,  setConstrL]   = useState('')
  const [constrRight, setConstrR]   = useState('')
  const [widthLeft,   setWidthL]    = useState('')
  const [widthRight,  setWidthR]    = useState('')
  const [sizeLeft,    setSizeL]     = useState('')
  const [sizeRight,   setSizeR]     = useState('')
  const [submitting,  setSubmitting] = useState(false)
  const [error,       setError]     = useState('')

  const showLeft  = unit !== 'RIGHT'
  const showRight = unit !== 'LEFT'
  const mirror    = unit === 'PAIR'

  // ── Product data ──
  const constructions = product.constructions ?? []
  const constructionOpts = constructions.map(c => c.construction)

  // Auto-select if only one construction
  useEffect(() => {
    if (constructionOpts.length === 1) {
      setConstrL(constructionOpts[0])
      setConstrR(constructionOpts[0])
    }
  }, [constructionOpts.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const widthsForConstrution = (constr: string) => {
    if (!constr) return [...new Set(constructions.flatMap(c => c.widths))]
    return constructions.find(c => c.construction === constr)?.widths ?? []
  }
  const widthsL = widthsForConstrution(constrLeft)
  const widthsR = widthsForConstrution(mirror ? constrLeft : constrRight)

  // Size list
  const sizes: string[] = []
  for (let s = product.size_first; s <= product.size_last; s += 0.5)
    sizes.push(String(Math.round(s * 2) / 2))

  // Mirror helpers
  function setConstrLeft(v: string) {
    setConstrL(v)
    if (mirror) setConstrR(v)
    setWidthL(''); if (mirror) setWidthR('')
  }
  function setWidthLeft(v: string)  { setWidthL(v); if (mirror) setWidthR(v) }
  function setSizeLeft(v: string)   { setSizeL(v);  if (mirror) setSizeR(v) }

  // ── Submit ──
  async function handleSubmit(status: 'draft' | 'submitted') {
    setError(''); setSubmitting(true)
    const sb = createClient()
    const { error: err } = await sb.from('orders').insert({
      user_id:            userId,
      company_id:         selectedCompanyId || userProfile.company_id,
      product_id:         product.id,
      status, unit, clinician, patient_name: patientName,
      reference_customer: reference, quantity,
      construction_left:  constrLeft || null,
      construction_right: mirror ? constrLeft || null : constrRight || null,
      width_left:         widthLeft || null,
      width_right:        mirror ? widthLeft || null : widthRight || null,
      size_left:          sizeLeft  ? parseFloat(sizeLeft)  : null,
      size_right:         (mirror ? sizeLeft : sizeRight) ? parseFloat(mirror ? sizeLeft : sizeRight) : null,
    })
    setSubmitting(false)
    if (err) { setError(err.message); return }
    router.push('/orders')
  }

  const inputCls = 'w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors'
  const labelCls = 'text-xs font-semibold text-stone-500 uppercase tracking-wide'

  // ── Company display ──
  const companyName = isAdmin
    ? (companies.find(c => c.id === selectedCompanyId)?.name ?? '')
    : (userCompany?.name ?? '')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-lg font-semibold text-stone-900 mb-6">{t('title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">

        {/* ── LEFT: Form ───────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* ── CUSTOMER BOX ── */}
          <div className="bg-white rounded-[14px] p-6 space-y-4"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Customer</h2>

            {/* Company */}
            <div className="space-y-1.5">
              <label className={labelCls}>Account</label>
              {isAdmin ? (
                <div className="relative">
                  <select className={inputCls + ' appearance-none pr-8'}
                    value={selectedCompanyId}
                    onChange={e => setCompanyId(e.target.value)}>
                    <option value="">— Select company —</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              ) : (
                <p className="h-9 px-3 flex items-center text-sm font-medium text-stone-800
                              bg-stone-100 border border-stone-200 rounded-lg">
                  {companyName}
                </p>
              )}
            </div>

            {/* Clinician */}
            <div className="space-y-1.5">
              <label className={labelCls}>Clinician</label>
              <input className={inputCls} value={clinician} onChange={e => setClinician(e.target.value)} />
            </div>

            {/* Patient name (below Clinician) */}
            <div className="space-y-1.5">
              <label className={labelCls}>Patient Name or number</label>
              <input className={inputCls} value={patientName} onChange={e => setPatient(e.target.value)} />
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <label className={labelCls}>Reference customer <span className="text-red-400">*</span></label>
              <input className={inputCls} value={reference} onChange={e => setReference(e.target.value)} required />
            </div>
          </div>

          {/* ── ORDER DETAILS BOX ── */}
          <div className="bg-white rounded-[14px] p-6 space-y-5"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Order details</h2>

            {/* Unit */}
            <div className="space-y-2">
              <label className={labelCls}>Unit <span className="text-red-400">*</span></label>
              <div className="flex flex-wrap gap-2">
                {([
                  ['PAIR',       'Pair (L = R)'],
                  ['LEFT',       'Left only'],
                  ['RIGHT',      'Right only'],
                  ['LEFT_RIGHT', 'Left ≠ Right'],
                  ['DIFF_SIZES', 'Different sizes'],
                ] as [Unit, string][]).map(([val, lbl]) => (
                  <button key={val} type="button" onClick={() => setUnit(val)}
                    className={`px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all
                      ${unit === val
                        ? 'bg-gold text-white border-gold shadow-sm'
                        : 'border-stone-200 text-stone-600 hover:border-gold/60 hover:text-gold'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5 max-w-[120px]">
              <label className={labelCls}>Quantity <span className="text-red-400">*</span></label>
              <input type="number" min={1} className={inputCls} value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
            </div>

            {/* Construction — only if model has constructions */}
            {constructionOpts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-stone-700 border-b border-stone-100 pb-1.5">
                  Construction style
                </h3>
                <div className={`grid gap-4 ${showLeft && showRight ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {showLeft && (
                    <div className="space-y-1.5">
                      {showRight && <p className="text-[10px] text-stone-400 uppercase tracking-wide">Left <span className="text-red-400">*</span></p>}
                      <Chips options={constructionOpts} value={constrLeft} onChange={setConstrLeft} />
                    </div>
                  )}
                  {showRight && (
                    <div className="space-y-1.5">
                      {showLeft && (
                        <p className="text-[10px] text-stone-400 uppercase tracking-wide">
                          Right <span className="text-red-400">*</span>
                          {mirror && <span className="text-stone-300 normal-case font-normal ml-1">= Left</span>}
                        </p>
                      )}
                      <div className={mirror ? 'opacity-40 pointer-events-none' : ''}>
                        <Chips options={constructionOpts} value={mirror ? constrLeft : constrRight}
                          onChange={setConstrR} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Width */}
            {(widthsL.length > 0 || widthsR.length > 0) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-stone-700 border-b border-stone-100 pb-1.5">Width</h3>
                <div className={`grid gap-4 ${showLeft && showRight ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {showLeft && (
                    <div className="space-y-1.5">
                      {showRight && <p className="text-[10px] text-stone-400 uppercase tracking-wide">Left <span className="text-red-400">*</span></p>}
                      <Chips options={widthsL} value={widthLeft} onChange={setWidthLeft} pill />
                    </div>
                  )}
                  {showRight && (
                    <div className="space-y-1.5">
                      {showLeft && (
                        <p className="text-[10px] text-stone-400 uppercase tracking-wide">
                          Right <span className="text-red-400">*</span>
                          {mirror && <span className="text-stone-300 normal-case font-normal ml-1">= Left</span>}
                        </p>
                      )}
                      <div className={mirror ? 'opacity-40 pointer-events-none' : ''}>
                        <Chips options={mirror ? widthsL : widthsR}
                          value={mirror ? widthLeft : widthRight} onChange={setWidthR} pill />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Size */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-700 border-b border-stone-100 pb-1.5">
                Size
                <span className="ml-2 text-gold font-normal text-xs normal-case">
                  EU {product.size_first}–{product.size_last}
                </span>
              </h3>
              <div className={`grid gap-4 ${showLeft && showRight ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {showLeft && (
                  <SizeInput sizes={sizes} value={sizeLeft} onChange={setSizeLeft}
                    label={showRight ? 'Left *' : 'Size *'} />
                )}
                {showRight && (
                  <div className={mirror ? 'opacity-40 pointer-events-none' : ''}>
                    <SizeInput sizes={sizes}
                      value={mirror ? sizeLeft : sizeRight}
                      onChange={setSizeR}
                      label={showLeft ? `Right *${mirror ? ' (= Left)' : ''}` : 'Size *'} />
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
              <button onClick={() => handleSubmit('submitted')}
                disabled={submitting || !reference}
                className="px-6 py-2.5 bg-gold text-white font-semibold text-sm rounded-xl
                           hover:bg-gold-dark transition-colors disabled:opacity-50">
                {t('submit')}
              </button>
              <button onClick={() => handleSubmit('draft')} disabled={submitting}
                className="px-6 py-2.5 border border-stone-200 text-stone-600 font-medium
                           text-sm rounded-xl hover:border-stone-300 transition-colors">
                {t('save_draft')}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Sticky product panel ───────────────────────────── */}
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            {/* Model header */}
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-stone-900 tracking-wide">
                  {product.style_name}
                </span>
                <span className="text-sm font-medium text-gold">{product.closure}</span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{product.color_name}</p>
              <p className="text-[10px] text-stone-400">{product.colour_id}</p>
            </div>

            {/* Product image — no card, dropshadow like detail page */}
            {product.picture_name && (
              <div className="relative aspect-square"
                style={{ filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.13)) drop-shadow(0 3px 8px rgba(0,0,0,0.07))' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BUCKET}/${product.picture_name}`}
                  alt={product.style_name}
                  className="w-full h-full object-contain p-2"
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
