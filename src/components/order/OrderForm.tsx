'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, Link } from '@/i18n/navigation'
import type { Product, Locale } from '@/types'
import AdditionsForm from './AdditionsForm'
import { emptyAdditions } from './additions-config'
import OrderSummary from './OrderSummary'
import { translateFilterValueSync, preloadFilterTranslations } from '@/lib/filter-translations'
import { displayWidth } from '@/lib/width-display'
import { insertOrderAction, updateOrderAction, deleteOrderAction, type PdfMeta } from '@/app/actions/orders'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`

type Unit    = 'PAIR' | 'LEFT' | 'RIGHT' | 'LEFT_RIGHT' | 'DIFF_SIZES'
type Company = { id: string; name: string; erp_code: string }
type Profile = { company_id: string | null; full_name: string | null; role: string }

// UNIT_LABELS moved to translations - will be accessed via t('unit_pair'), etc.

type Props = {
  product:     Product
  userId:      string
  userProfile: Profile
  userCompany: Company | null
  companies:   Company[]
  isAdmin:     boolean
  draftId?:    string                          // set when editing/duplicating a draft
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draftData?:  Record<string, any> | null      // pre-fill values from existing order
}

// ── Single-select chip ────────────────────────────────────────────────────────
function Chips({ options, value, onChange, pill = false, collapse = false, renderLabel }: {
  options: string[]
  value: string
  onChange: (v: string) => void
  pill?: boolean
  collapse?: boolean
  renderLabel?: (v: string) => string
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
          {renderLabel ? renderLabel(o) : o}
        </button>
      ))}
    </div>
  )
}

// ── Side label (clear, colour-coded Left/Right marker) ───────────────────────
function SideLabel({ side, text }: { side: 'L' | 'R'; text: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white
        ${side === 'L' ? 'bg-stone-600' : 'bg-gold'}`}>{side}</span>
      {text}<span className="text-red-400 ml-0.5">*</span>
    </p>
  )
}

// ── Size input with datalist ──────────────────────────────────────────────────
function SizeInput({ sizes, value, onChange, label, side, onBlurAfterSnap }: {
  sizes: string[]
  value: string
  onChange: (v: string) => void
  label: string
  side?: 'L' | 'R'
  onBlurAfterSnap?: (v: string) => void
}) {
  const id = `size-list-${label}`
  return (
    <div className="space-y-1.5">
      {side ? <SideLabel side={side} text={label} /> : <p className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</p>}
      <div className="relative">
        <input
          list={id}
          value={value}
          onFocus={e => e.currentTarget.select()}
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

export default function OrderForm({ product, userId, userProfile, userCompany, companies, isAdmin, draftId, draftData }: Props) {
  const t  = useTranslations('order')
  const locale = useLocale()
  const router = useRouter()
  const d = draftData  // shorthand for pre-fill

  // Filter-value translations (construction names) come from a synchronous cache
  // populated async — preload it, then bump state so the chips re-render translated.
  const [, setI18nReady] = useState(0)
  useEffect(() => {
    preloadFilterTranslations().then(() => setI18nReady(n => n + 1))
  }, [])
  const trConstruction = (v: string) => translateFilterValueSync(v, locale as Locale)

  // ── Restore state from sessionStorage (for locale changes) ──
  const STORAGE_KEY = `order-form-state-${product.id}`

  function getInitialState<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed[key] !== undefined ? parsed[key] : defaultValue
      }
    } catch (err) {
      console.warn('Failed to restore form state:', err)
    }
    return defaultValue
  }

  // ── Form state — pre-filled from draftData or sessionStorage ──
  const [selectedCompanyId, setCompanyId] = useState(getInitialState('selectedCompanyId', d?.company_id ?? userCompany?.id ?? userProfile.company_id ?? ''))
  const [unit,        setUnit]      = useState<Unit>(getInitialState('unit', (d?.unit as Unit) ?? 'PAIR'))
  const [clinician,   setClinician] = useState(getInitialState('clinician', d?.clinician ?? ''))
  const [patientName, setPatient]   = useState(getInitialState('patientName', d?.patient_name ?? ''))
  const [reference,   setReference] = useState(getInitialState('reference', d?.reference_customer ?? ''))
  const [quantity,    setQuantity]  = useState(getInitialState('quantity', d?.quantity ?? 1))
  const [constrLeft,  setConstrL]   = useState(getInitialState('constrLeft', d?.construction_left ?? ''))
  const [constrRight, setConstrR]   = useState(getInitialState('constrRight', d?.construction_right ?? ''))
  const [widthLeft,   setWidthL]    = useState(getInitialState('widthLeft', d?.width_left ?? ''))
  const [widthRight,  setWidthR]    = useState(getInitialState('widthRight', d?.width_right ?? ''))
  const [sizeLeft,    setSizeL]     = useState(getInitialState('sizeLeft', d?.size_left != null ? String(d.size_left) : ''))
  const [sizeRight,   setSizeR]     = useState(getInitialState('sizeRight', d?.size_right != null ? String(d.size_right) : ''))
  const [additions,   setAdditions] = useState<Record<string, unknown>>(getInitialState('additions', d?.additions ?? emptyAdditions()))
  const [diffSizesPairs, setDiffSizesPairs] = useState<Array<{ qty: number; size: string }>>(
    getInitialState('diffSizesPairs', d?.diff_sizes_pairs ?? [{ qty: 1, size: '' }])
  )
  const [step,        setStep]      = useState<1 | 2 | 3>(getInitialState('step', 1))
  const [submitting,  setSubmitting] = useState(false)
  const [discarding,  setDiscarding] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [error,       setError]     = useState('')
  const [successMsg,  setSuccessMsg] = useState('')

  const showAdditions = unit !== 'DIFF_SIZES'

  const isDouble    = unit === 'LEFT_RIGHT'
  const mirror      = unit === 'PAIR'
  const sideLabel   = unit === 'LEFT'  ? t('left')
                    : unit === 'RIGHT' ? t('right')
                    : ''

  // ── Different Sizes helpers ──
  const addDiffSizesPair = () => {
    if (diffSizesPairs.length < 10) {
      setDiffSizesPairs([...diffSizesPairs, { qty: 1, size: '' }])
    }
  }
  const removeDiffSizesPair = (idx: number) => {
    if (diffSizesPairs.length > 1) {
      setDiffSizesPairs(diffSizesPairs.filter((_, i) => i !== idx))
    }
  }
  const updateDiffSizesPair = (idx: number, field: 'qty' | 'size', value: string | number) => {
    const updated = [...diffSizesPairs]
    if (field === 'qty') {
      updated[idx].qty = typeof value === 'number' ? value : parseInt(String(value)) || 1
    } else {
      updated[idx].size = String(value)
    }
    setDiffSizesPairs(updated)
  }

  // ── Product data ──
  const constructions = product.constructions ?? []
  const constructionOpts = constructions.map(c => c.construction)

  // Save form state to sessionStorage on every change (for locale switching)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const state = {
      selectedCompanyId, unit, clinician, patientName, reference, quantity,
      constrLeft, constrRight, widthLeft, widthRight, sizeLeft, sizeRight,
      additions, diffSizesPairs, step
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (err) {
      console.warn('Failed to save form state:', err)
    }
  }, [
    selectedCompanyId, unit, clinician, patientName, reference, quantity,
    constrLeft, constrRight, widthLeft, widthRight, sizeLeft, sizeRight,
    additions, diffSizesPairs, step, STORAGE_KEY
  ])

  // Auto-select if only one construction
  useEffect(() => {
    if (constructionOpts.length === 1) {
      setConstrL(constructionOpts[0])
      setConstrR(constructionOpts[0])
    }
  }, [constructionOpts.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear only size fields when switching to DIFF_SIZES
  useEffect(() => {
    if (unit === 'DIFF_SIZES') {
      setSizeL('')
      setSizeR('')
    }
  }, [unit])

  const widthsForConstrution = (constr: string) => {
    if (!constr) return [...new Set(constructions.flatMap(c => c.widths))]
    return constructions.find(c => c.construction === constr)?.widths ?? []
  }
  const widthsL = widthsForConstrution(constrLeft)
  const widthsR = widthsForConstrution(mirror ? constrLeft : constrRight)

  // Auto-select width if only one option
  useEffect(() => {
    if (widthsL.length === 1 && !widthLeft) {
      setWidthL(widthsL[0])
      if (mirror) setWidthR(widthsL[0])
    }
  }, [widthsL.length, widthLeft, mirror]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mirror && !isDouble && widthsR.length === 1 && !widthRight && unit === 'RIGHT') {
      setWidthR(widthsR[0])
    }
  }, [widthsR.length, widthRight, mirror, isDouble, unit]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const companyId = selectedCompanyId || userCompany?.id || null
      if (!companyId) {
        setError('Please select a company.')
        setSubmitting(false)
        return
      }
      const { comments: addComments, ...additionFields } = additions as Record<string, unknown>
      const row = {
        user_id:            userId,
        company_id:         companyId,
        locale:             locale as Locale,
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
        diff_sizes_pairs:   unit === 'DIFF_SIZES'
          ? diffSizesPairs.map(p => ({ qty: p.qty, size: parseFloat(p.size) }))
          : null,
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

      const result = draftId
        ? await updateOrderAction(draftId, row, pdfMeta)
        : await insertOrderAction(row, pdfMeta)
      if (result.error) throw new Error(result.error)

      if (status === 'submitted') {
        const msg = result.pdfError
          ? `${t('order_submitted_pdf_error')} ${result.pdfError}`
          : result.emailError
            ? `${t('order_submitted_email_error')} ${result.emailError}`
            : result.pdf_url
              ? t('order_submitted_complete')
              : t('order_submitted')
        setSuccessMsg(msg)
        await new Promise(r => setTimeout(r, 3000))
      }
      // Clear saved state on successful submit
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY)
      }
      router.push('/orders')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDiscard() {
    if (!draftId) return
    setDiscarding(true)
    try {
      const result = await deleteOrderAction(draftId)
      if (result.error) throw new Error(result.error)
      // Clear saved state on discard
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY)
      }
      router.push('/orders')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDiscarding(false)
    }
  }

  async function handlePreviewPdf() {
    setDownloadingPdf(true)
    try {
      const { comments: addComments, ...additionFields } = additions as Record<string, unknown>

      const pdfData = {
        reference: reference || null,
        status: 'draft',
        unit,
        clinician: clinician || null,
        patient_name: patientName || null,
        quantity,
        construction_left: constrLeft || null,
        construction_right: mirror ? constrLeft || null : constrRight || null,
        width_left: widthLeft || null,
        width_right: mirror ? widthLeft || null : widthRight || null,
        size_left: sizeLeft ? parseFloat(sizeLeft) : null,
        size_right: (mirror ? sizeLeft : sizeRight) ? parseFloat(mirror ? sizeLeft : sizeRight) : null,
        additions: additionFields,
        comments: String(addComments ?? '') || null,
        created_at: new Date().toISOString(),
        companyName,
        productColourId: product.colour_id,
        productColorName: product.color_name,
        productClosure: product.closure,
        productImageUrl: product.picture_name
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${product.picture_name}`
          : undefined,
        diff_sizes_pairs: unit === 'DIFF_SIZES'
          ? diffSizesPairs.map(p => ({ qty: p.qty, size: parseFloat(p.size) }))
          : null,
        locale: locale as Locale,
      }

      const response = await fetch('/api/orders/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate PDF')
      }

      // Open PDF in new tab
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const inputCls = 'w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors'
  const labelCls = 'text-xs font-bold text-stone-700 uppercase tracking-wide'

  // ── Company display ──
  // Show a picker for admins (all companies) and for non-admins who belong to
  // more than one company; a single-company user just sees the static name.
  const showCompanyPicker = isAdmin || companies.length > 0
  const companyName = showCompanyPicker
    ? (companies.find(c => c.id === selectedCompanyId)?.name ?? userCompany?.name ?? '')
    : (userCompany?.name ?? '')

  const stepLabels: Record<number, string> = { 1: t('tab1'), 2: t('tab2'), 3: t('tab3') }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-stone-900">{t('title')}</h1>
        <Link href={`/gallery/${product.id}`}
          className="text-sm font-medium text-stone-400 hover:text-stone-700 inline-flex items-center gap-1.5">
          <span aria-hidden>←</span> {t('cancel')}
        </Link>
      </div>

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
          {/* Top actions bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wide">{t('tab2')}</h2>
            <button onClick={() => handleSubmit('draft')} disabled={submitting}
              className="px-4 py-2 border border-stone-200 text-stone-600 font-medium text-xs rounded-lg
                         hover:border-stone-300 transition-colors disabled:opacity-50">
              {submitting ? t('processing') : t('save_draft')}
            </button>
          </div>
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
            <button onClick={() => handleSubmit('draft')} disabled={submitting}
              className="px-6 py-2.5 border border-stone-200 text-stone-600 font-medium
                         text-sm rounded-xl hover:border-stone-300 transition-colors disabled:opacity-50">
              {submitting ? t('processing') : t('save_draft')}
            </button>
            <button onClick={() => setStep(1)}
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors ml-auto">
              ← {t('tab1')}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: Confirmation ──────────────────────────────────────── */}
      {step === 3 && (
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
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => handleSubmit('submitted')}
              disabled={submitting || discarding || !reference || !!successMsg}
              className="px-6 py-2.5 bg-gold text-white font-semibold text-sm rounded-xl
                         hover:bg-gold-dark transition-colors disabled:opacity-50 inline-flex items-center gap-2">
              {submitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
              {submitting ? t('processing') : t('submit')}
            </button>
            <button onClick={() => handleSubmit('draft')} disabled={submitting || discarding || !!successMsg}
              className="px-6 py-2.5 border border-stone-200 text-stone-600 font-medium
                         text-sm rounded-xl hover:border-stone-300 transition-colors">
              {t('save_draft')}
            </button>
            <button onClick={handlePreviewPdf} disabled={downloadingPdf || submitting || discarding || !!successMsg}
              className="px-6 py-2.5 border border-gold text-gold font-medium
                         text-sm rounded-xl hover:bg-gold/5 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
              {downloadingPdf && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
              {downloadingPdf ? t('generating') : t('preview_pdf')}
            </button>
            {draftId && (
              <button onClick={handleDiscard} disabled={submitting || discarding || !!successMsg}
                className="px-4 py-2.5 border border-red-200 text-red-500 font-medium text-sm
                           rounded-xl hover:bg-red-50 transition-colors inline-flex items-center gap-1.5">
                {discarding && (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                Descartar
              </button>
            )}
            <button type="button" onClick={() => setStep(showAdditions ? 2 : 1)}
              className="text-sm text-stone-400 hover:text-stone-600 transition-colors ml-auto">
              ← {showAdditions ? t('tab2') : t('tab1')}
            </button>
          </div>

          <OrderSummary
            companyName={companyName}
            clinician={clinician}
            patientName={patientName}
            reference={reference}
            product={product}
            unit={unit}
            quantity={quantity}
            diffSizesPairs={diffSizesPairs}
            constrLeft={constrLeft}
            constrRight={constrRight}
            widthLeft={widthLeft}
            widthRight={widthRight}
            sizeLeft={sizeLeft}
            sizeRight={sizeRight}
            additions={additions}
            comments={additions['comments'] as string | null}
            showAdditions={showAdditions}
            onEditAdditions={() => setStep(2)}
          />
        </div>
      )}

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
              {showCompanyPicker ? (
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
              <input className={inputCls} value={clinician} onFocus={e => e.currentTarget.select()} onChange={e => setClinician(e.target.value)} />
            </div>

            {/* Patient name */}
            <div className="space-y-1.5">
              <label className={labelCls}>{t('patient')}</label>
              <input className={inputCls} value={patientName} onFocus={e => e.currentTarget.select()} onChange={e => setPatient(e.target.value)} />
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <label className={labelCls}>{t('reference')} <span className="text-red-400">*</span></label>
              <input className={inputCls} value={reference} onFocus={e => e.currentTarget.select()} onChange={e => setReference(e.target.value)} required />
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

            {/* Quantity — hide for DIFF_SIZES */}
            {unit !== 'DIFF_SIZES' && (
              <div className="space-y-1.5 max-w-[120px]">
                <label className={labelCls}>{t('quantity')} <span className="text-red-400">*</span></label>
                <input type="number" min={1} className={inputCls} value={quantity}
                  onFocus={e => e.currentTarget.select()}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
            )}

            {/* Different Sizes pairs table */}
            {unit === 'DIFF_SIZES' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-700">
                    {t('pairs_sizes')} <span className="text-red-400">*</span>
                  </h3>
                  <span className="text-xs text-stone-400">{diffSizesPairs.length}/10</span>
                </div>
                <div className="space-y-2">
                  {diffSizesPairs.map((pair, idx) => {
                    // Filter out already selected sizes (exclude current pair's size)
                    const selectedSizes = diffSizesPairs
                      .map((p, i) => i !== idx ? p.size : null)
                      .filter(s => s && s !== '')
                    const availableSizes = sizes.filter(s => !selectedSizes.includes(s))

                    return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-stone-400 uppercase tracking-wide">
                            {t('quantity')}
                          </label>
                          <input
                            type="number"
                            min={1}
                            className={inputCls}
                            value={pair.qty}
                            onFocus={e => e.currentTarget.select()}
                            onChange={e => updateDiffSizesPair(idx, 'qty', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-stone-400 uppercase tracking-wide">
                            {t('size')}
                          </label>
                          <input
                            list={`diff-size-list-${idx}`}
                            className={inputCls}
                            value={pair.size}
                            onFocus={e => e.currentTarget.select()}
                            onChange={e => updateDiffSizesPair(idx, 'size', e.target.value)}
                            onBlur={e => {
                              const v = parseFloat(e.target.value)
                              if (isNaN(v)) { updateDiffSizesPair(idx, 'size', ''); return }
                              const nearest = availableSizes.reduce((p, c) =>
                                Math.abs(parseFloat(c) - v) < Math.abs(parseFloat(p) - v) ? c : p
                              )
                              updateDiffSizesPair(idx, 'size', nearest)
                            }}
                            placeholder="—"
                          />
                          <datalist id={`diff-size-list-${idx}`}>
                            {availableSizes.map(s => <option key={s} value={s} />)}
                          </datalist>
                        </div>
                      </div>
                      {diffSizesPairs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDiffSizesPair(idx)}
                          className="mt-5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove pair"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    )
                  })}
                </div>
                {diffSizesPairs.length < 10 && (
                  <button
                    type="button"
                    onClick={addDiffSizesPair}
                    className="w-full py-2 border border-dashed border-stone-300 text-stone-500
                               text-xs font-medium rounded-lg hover:border-gold hover:text-gold
                               transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                    {t('add_pair')}
                  </button>
                )}
              </div>
            )}

            {/* Construction */}
            {constructionOpts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-stone-700 border-b border-stone-100 pb-1.5">
                  {t('construction')}
                </h3>
                {!isDouble ? (
                  <div className="space-y-1.5">
                    {sideLabel && <p className="text-[10px] text-stone-400 uppercase tracking-wide">{sideLabel}</p>}
                    <Chips collapse renderLabel={trConstruction}
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
                      <SideLabel side="L" text={t('left')} />
                      <Chips renderLabel={trConstruction} options={constructionOpts} value={constrLeft} onChange={setConstrLeft} />
                    </div>
                    <div className="space-y-1.5">
                      <SideLabel side="R" text={t('right')} />
                      <Chips renderLabel={trConstruction} options={constructionOpts} value={constrRight} onChange={(v) => { setConstrR(v); setWidthR('') }} />
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
                    renderLabel={(v) => displayWidth(v, unit === 'RIGHT' ? widthsR : widthsL, locale)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <SideLabel side="L" text={t('left')} />
                    <Chips pill options={widthsL} value={widthLeft} onChange={setWidthLeft} renderLabel={(v) => displayWidth(v, widthsL, locale)} />
                  </div>
                  <div className="space-y-1.5">
                    <SideLabel side="R" text={t('right')} />
                    <Chips pill options={widthsR} value={widthRight} onChange={setWidthR} renderLabel={(v) => displayWidth(v, widthsR, locale)} />
                  </div>
                </div>
              )}
            </div>

            {/* Size */}
            {unit !== 'DIFF_SIZES' && (
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
                  <SizeInput sizes={sizes} value={sizeLeft} onChange={setSizeLeft} label={t('left')} side="L"
                    onBlurAfterSnap={v => { if (v && !sizeRight) setSizeR(v) }} />
                  <SizeInput sizes={sizes} value={sizeRight} onChange={setSizeR} label={t('right')} side="R" />
                </div>
              )}
            </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Tab 1 actions → next step */}
            <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
              <button type="button"
                disabled={
                  !reference ||
                  (constructionOpts.length > 0 && !constrLeft && unit !== 'RIGHT') ||
                  (constructionOpts.length > 0 && !constrRight && (unit === 'RIGHT' || isDouble)) ||
                  (widthsL.length > 0 && !widthLeft && unit !== 'RIGHT') ||
                  (widthsR.length > 0 && !widthRight && (unit === 'RIGHT' || isDouble)) ||
                  (unit === 'DIFF_SIZES' && !diffSizesPairs.some(p => p.size))
                }
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
