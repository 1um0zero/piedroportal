'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import type { Product } from '@/types'
import AdditionsForm from './AdditionsForm'
import { emptyAdditions, SECTIONS } from './additions-config'
import { insertOrderAction, type PdfMeta } from '@/app/actions/orders'

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
function Chips({ options, value, onChange, pill = false, collapse = false }: {
  options: string[]
  value: string
  onChange: (v: string) => void
  pill?: boolean
  collapse?: boolean
}) {
  const displayed = collapse && value ? [value] : options
  return (
    <div className="flex flex-wrap gap-1.5">
      {displayed.map(o => (
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
function SizeInput({ sizes, value, onChange, label, onBlurAfterSnap }: {
  sizes: string[]
  value: string
  onChange: (v: string) => void
  label: string
  onBlurAfterSnap?: (v: string) => void
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
            if (isNaN(v)) { onChange(''); onBlurAfterSnap?.(''); return }
            const nearest = sizes.reduce((p, c) =>
              Math.abs(parseFloat(c) - v) < Math.abs(parseFloat(p) - v) ? c : p
            )
            onChange(nearest)
            onBlurAfterSnap?.(nearest)
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
  const [additions,   setAdditions] = useState<Record<string, unknown>>(emptyAdditions())
  const [step,        setStep]      = useState<1 | 2 | 3>(1)
  const [submitting,  setSubmitting] = useState(false)
  const [error,       setError]     = useState('')
  const [successMsg,  setSuccessMsg] = useState('')

  const showAdditions = unit !== 'DIFF_SIZES'
  const steps = showAdditions ? [1, 2, 3] : [1, 3]

  const isDouble    = unit === 'LEFT_RIGHT'
  const mirror      = unit === 'PAIR'
  const displaySide: 'l' | 'r' = unit === 'RIGHT' ? 'r' : 'l'
  const sideLabel   = unit === 'LEFT'  ? t('left')
                    : unit === 'RIGHT' ? t('right')
                    : ''

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

  // Mirror helpers — PAIR mirrors both feet; LEFT_RIGHT copies to right if right is empty
  function setConstrLeft(v: string) {
    setConstrL(v)
    if (mirror) { setConstrR(v); setWidthR('') }
    else if (isDouble && !constrRight) setConstrR(v)
    setWidthL('')
  }
  function setWidthLeft(v: string) {
    setWidthL(v)
    if (mirror) setWidthR(v)
    else if (isDouble && !widthRight) setWidthR(v)
  }
  function setSizeLeft(v: string) {
    setSizeL(v)
    if (mirror) setSizeR(v)
  }

  // ── Submit — uses Server Action to avoid client-side auth issues ──
  async function handleSubmit(status: 'draft' | 'submitted') {
    setError(''); setSubmitting(true)
    try {
      const { comments: addComments, ...additionFields } = additions as Record<string, unknown>
      const row = {
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
        additions:          additionFields,
        comments:           String(addComments ?? '') || null,
      }

      const pdfMeta: PdfMeta | undefined = status === 'submitted' ? {
        productColourId:  product.colour_id,
        productColorName: product.color_name,
        productClosure:   product.closure,
        productImageUrl:  product.picture_name
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${product.picture_name}`
          : undefined,
        companyName,
      } : undefined

      const result = await insertOrderAction(row, pdfMeta)
      if (result.error) throw new Error(result.error)

      if (status === 'submitted') {
        const msg = result.pdf_url
          ? 'Encomenda submetida. PDF gerado e anexado.'
          : result.pdfError
            ? `Encomenda submetida. Erro no PDF: ${result.pdfError}`
            : 'Encomenda submetida.'
        setSuccessMsg(msg)
        await new Promise(r => setTimeout(r, 3000))
      }
      router.push('/orders')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors'
  const labelCls = 'text-xs font-bold text-stone-700 uppercase tracking-wide'

  // ── Company display ──
  const companyName = isAdmin
    ? (companies.find(c => c.id === selectedCompanyId)?.name ?? '')
    : (userCompany?.name ?? '')

  const stepLabels: Record<number, string> = { 1: t('tab1'), 2: t('tab2'), 3: t('tab3') }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-lg font-semibold text-stone-900 mb-4">{t('title')}</h1>

      {/* Step tabs */}
      <div className="flex gap-0 border-b border-stone-200 mb-6">
        {(showAdditions ? [1, 2, 3] : [1, 3]).map((n, idx) => (
          <button key={n} type="button"
            onClick={() => n < step ? setStep(n as 1|2|3) : undefined}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${step === n ? 'border-gold text-gold' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
            {idx + 1}. {stepLabels[n]}
          </button>
        ))}
      </div>

      {/* ── TAB 2: Additions ─────────────────────────────────────────── */}
      {step === 2 && showAdditions && (
        <div className="space-y-4">
          <AdditionsForm
            unit={unit}
            closure={product.closure}
            addsExclude={(product as unknown as Record<string, string>).adds_exclude ?? ''}
            additions={additions}
            onChange={setAdditions}
          />
          <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
            <button onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-gold text-white font-semibold text-sm rounded-xl
                         hover:bg-gold-dark transition-colors">
              {t('tab3')} →
            </button>
            <button onClick={() => setStep(1)}
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors ml-auto">
              ← {t('tab1')}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: Confirmation ──────────────────────────────────────── */}
      {step === 3 && (() => {
        // Build detailed additions list for display
        type SidedVal = { l: unknown; r: unknown }
        const addDetail = SECTIONS.map(sec => {
          const filled = sec.fields.flatMap(field => {
            if (field.side === 'global') {
              return additions[field.key] === true
                ? [{ label: field.label.replace(/\s*\(mm\)/gi, ''), l: 'Yes', r: null }]
                : []
            }
            const sv = additions[field.key] as SidedVal | null
            const hasL = sv?.l != null && sv.l !== '' && sv.l !== false
            const hasR = sv?.r != null && sv.r !== '' && sv.r !== false
            if (!hasL && !hasR) return []
            return [{
              label: field.label.replace(/↳\s*/g, '  · ').replace(/\s*\(mm\)/gi, ''),
              l: hasL ? String(sv!.l) : null,
              r: hasR ? String(sv!.r) : null,
            }]
          })
          return { key: sec.key, label: sec.label, filled }
        }).filter(s => s.filled.length > 0)

        return (
        <div className="space-y-4">

          {/* Success banner */}
          {successMsg && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
              </svg>
              <div>
                <p className="text-sm text-green-700 font-medium">{successMsg}</p>
                <p className="text-xs text-green-600 mt-0.5">A redirecionar para My Orders…</p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Submit actions — top for easy access */}
          <div className="flex items-center gap-3">
            <button onClick={() => handleSubmit('submitted')}
              disabled={submitting || !reference || !!successMsg}
              className="px-6 py-2.5 bg-gold text-white font-semibold text-sm rounded-xl
                         hover:bg-gold-dark transition-colors disabled:opacity-50 inline-flex items-center gap-2">
              {submitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
              {submitting ? 'A processar…' : t('submit')}
            </button>
            <button onClick={() => handleSubmit('draft')} disabled={submitting || !!successMsg}
              className="px-6 py-2.5 border border-stone-200 text-stone-600 font-medium
                         text-sm rounded-xl hover:border-stone-300 transition-colors">
              {t('save_draft')}
            </button>
            <button type="button" onClick={() => setStep(showAdditions ? 2 : 1)}
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors ml-auto">
              ← {showAdditions ? t('tab2') : t('tab1')}
            </button>
          </div>

          {/* Customer + Product */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-[14px] p-5 space-y-2" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t('customer')}</h3>
              <p className="font-semibold text-stone-900">{companyName}</p>
              {clinician   && <p className="text-xs text-stone-500">{t('clinician')}: {clinician}</p>}
              {patientName && <p className="text-xs text-stone-500">{t('patient')}: {patientName}</p>}
              {reference   && <p className="text-xs text-stone-500">{t('reference')}: {reference}</p>}
              <p className="text-xs text-stone-400">{t('unit')}: {unit} · {t('quantity')}: {quantity}</p>
            </div>
            <div className="bg-white rounded-[14px] p-5 space-y-2" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Produto</h3>
              <p className="font-bold text-stone-900">{product.colour_id}</p>
              <p className="text-sm text-stone-500">{product.color_name} · {product.closure}</p>
              {(constrLeft || constrRight) && (
                <p className="text-xs text-stone-400">{t('construction')}: {
                  isDouble && constrRight && constrRight !== constrLeft
                    ? `L: ${constrLeft || '—'}  R: ${constrRight || '—'}`
                    : unit === 'RIGHT' ? constrRight : constrLeft
                }</p>
              )}
              {(widthLeft || widthRight) && (
                <p className="text-xs text-stone-400">{t('width')}: {
                  isDouble && widthRight && widthRight !== widthLeft
                    ? `L: ${widthLeft || '—'}  R: ${widthRight || '—'}`
                    : unit === 'RIGHT' ? widthRight : widthLeft
                }</p>
              )}
              {(sizeLeft || sizeRight) && (
                <p className="text-xs text-stone-400">{t('size')}: {
                  isDouble && sizeRight && sizeRight !== sizeLeft
                    ? `L: ${sizeLeft || '—'}  R: ${sizeRight || '—'}`
                    : unit === 'RIGHT' ? sizeRight : sizeLeft
                }</p>
              )}
            </div>
          </div>

          {/* Additions detail */}
          {showAdditions && addDetail.length > 0 && (
            <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t('tab2')}</h3>
                <button type="button" onClick={() => setStep(2)}
                  className="text-xs text-gold hover:underline">editar</button>
              </div>
              <div className="space-y-4">
                {addDetail.map(sec => (
                  <div key={sec.key}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{sec.label}</p>
                    <div className="divide-y divide-stone-50">
                      {sec.filled.map((f, i) => (
                        <div key={i} className="flex items-baseline justify-between py-1.5 gap-4">
                          <span className="text-xs text-stone-500 min-w-0">{f.label}</span>
                          {isDouble && f.r !== null ? (
                            <span className="text-xs font-semibold text-stone-700 shrink-0">
                              L: {f.l ?? '—'} · R: {f.r}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-stone-700 shrink-0">{f.l ?? f.r}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showAdditions && addDetail.length === 0 && (
            <p className="text-xs text-stone-400 italic px-1">
              {t('tab2')}: nenhuma adição registada.{' '}
              <button type="button" onClick={() => setStep(2)} className="text-gold hover:underline">Adicionar</button>
            </p>
          )}
        </div>
        )
      })()}

      {/* ── TAB 1: Customer + Product ────────────────────────────────── */}
      {step === 1 && (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8">

        {/* ── LEFT: Form ───────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* ── CUSTOMER BOX ── */}
          <div className="bg-white rounded-[14px] p-6 space-y-4"
            style={{ boxShadow: 'var(--shadow-card)' }}>

            {/* Company — no section title, label = Customer */}
            <div className="space-y-1.5">
              <label className={labelCls}>{t('customer')}</label>
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
              <label className={labelCls}>{t('clinician')}</label>
              <input className={inputCls} value={clinician} onChange={e => setClinician(e.target.value)} />
            </div>

            {/* Patient name */}
            <div className="space-y-1.5">
              <label className={labelCls}>{t('patient')}</label>
              <input className={inputCls} value={patientName} onChange={e => setPatient(e.target.value)} />
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <label className={labelCls}>{t('reference')} <span className="text-red-400">*</span></label>
              <input className={inputCls} value={reference} onChange={e => setReference(e.target.value)} required />
            </div>
          </div>

          {/* ── ORDER DETAILS BOX ── */}
          <div className="bg-white rounded-[14px] p-6 space-y-5"
            style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('order_details')}</h2>

            {/* Unit */}
            <div className="space-y-2">
              <label className={labelCls}>{t('unit')} <span className="text-red-400">*</span></label>
              <div className="flex flex-wrap gap-2">
                {([
                  ['PAIR',       t('unit_pair')],
                  ['LEFT',       t('unit_left')],
                  ['RIGHT',      t('unit_right')],
                  ['LEFT_RIGHT', t('unit_lr')],
                  ['DIFF_SIZES', t('unit_sizes')],
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
              <label className={labelCls}>{t('quantity')} <span className="text-red-400">*</span></label>
              <input type="number" min={1} className={inputCls} value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
            </div>

            {/* Construction */}
            {constructionOpts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-stone-700 border-b border-stone-100 pb-1.5">
                  {t('construction')}
                </h3>
                {!isDouble ? (
                  <div className="space-y-1.5">
                    {sideLabel && <p className="text-[10px] text-stone-400 uppercase tracking-wide">{sideLabel}</p>}
                    <Chips collapse
                      options={constructionOpts}
                      value={unit === 'RIGHT' ? constrRight : constrLeft}
                      onChange={unit === 'RIGHT'
                        ? (v) => { setConstrR(v); setWidthR('') }
                        : setConstrLeft}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-stone-400 uppercase tracking-wide">{t('left')} <span className="text-red-400">*</span></p>
                      <Chips collapse options={constructionOpts} value={constrLeft} onChange={setConstrLeft} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-stone-400 uppercase tracking-wide">{t('right')} <span className="text-red-400">*</span></p>
                      <Chips collapse options={constructionOpts} value={constrRight} onChange={(v) => { setConstrR(v); setWidthR('') }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Width — shows placeholder if no construction selected */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-700 border-b border-stone-100 pb-1.5">
                {t('width')}
              </h3>
              {!isDouble && !(unit === 'RIGHT' ? constrRight : constrLeft) && constructionOpts.length > 0 ? (
                <p className="text-xs text-stone-400 italic">{t('select_construction')}</p>
              ) : !isDouble ? (
                <div className="space-y-1.5">
                  {sideLabel && <p className="text-[10px] text-stone-400 uppercase tracking-wide">{sideLabel}</p>}
                  <Chips collapse pill
                    options={unit === 'RIGHT' ? widthsR : widthsL}
                    value={unit === 'RIGHT' ? widthRight : widthLeft}
                    onChange={unit === 'RIGHT' ? setWidthR : setWidthLeft}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">{t('left')} <span className="text-red-400">*</span></p>
                    <Chips collapse pill options={widthsL} value={widthLeft} onChange={setWidthLeft} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">{t('right')} <span className="text-red-400">*</span></p>
                    <Chips collapse pill options={widthsR} value={widthRight} onChange={setWidthR} />
                  </div>
                </div>
              )}
            </div>

            {/* Size */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-700 border-b border-stone-100 pb-1.5">
                {t('size')}
                <span className="ml-2 text-gold font-normal text-xs normal-case">
                  EU {product.size_first}–{product.size_last}
                </span>
              </h3>
              {!isDouble ? (
                <SizeInput
                  sizes={sizes}
                  value={unit === 'RIGHT' ? sizeRight : sizeLeft}
                  onChange={unit === 'RIGHT' ? setSizeR : setSizeLeft}
                  label={sideLabel ? `${sideLabel} *` : `${t('size')} *`}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <SizeInput sizes={sizes} value={sizeLeft} onChange={setSizeLeft} label={`${t('left')} *`}
                    onBlurAfterSnap={v => { if (v && !sizeRight) setSizeR(v) }} />
                  <SizeInput sizes={sizes} value={sizeRight} onChange={setSizeR} label={`${t('right')} *`} />
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Tab 1 actions → next step */}
            <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
              <button type="button"
                disabled={!reference}
                onClick={() => setStep(showAdditions ? 2 : 3)}
                className="px-6 py-2.5 bg-gold text-white font-semibold text-sm rounded-xl
                           hover:bg-gold-dark transition-colors disabled:opacity-50">
                {showAdditions ? `${t('tab2')} →` : `${t('tab3')} →`}
              </button>
              <button onClick={() => handleSubmit('draft')} disabled={submitting}
                className="px-6 py-2.5 border border-stone-200 text-stone-600 font-medium
                           text-sm rounded-xl hover:border-stone-300 transition-colors
                           inline-flex items-center gap-2">
                {submitting && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                {submitting ? 'A guardar…' : t('save_draft')}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Sticky product panel ───────────────────────────── */}
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            {/* Model header — colour_id prominent, style_name smaller */}
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-stone-900 tracking-wide">
                  {product.colour_id}
                </span>
                <span className="text-sm font-medium text-gold">{product.closure}</span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{product.color_name}</p>
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
      )} {/* end step 1 */}

    </div>
  )
}
