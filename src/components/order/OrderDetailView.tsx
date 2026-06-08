'use client'

import { useState, useTransition } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, Link } from '@/i18n/navigation'
import OrderSummary from './OrderSummary'
import { updateOrderAdminAction, translateTextAction } from '@/app/actions/admin-orders'
import { APPROVAL_STATES, PRODUCTION_STATES, type ApprovalState, type ProductionState } from '@/lib/order-status'

const PORTAL_STATUS_BADGE: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-500', submitted: 'bg-blue-50 text-blue-600',
  approved: 'bg-green-50 text-green-700', in_production: 'bg-amber-50 text-amber-700',
  shipped: 'bg-violet-50 text-violet-700', delivered: 'bg-teal-50 text-teal-700',
  cancelled: 'bg-red-50 text-red-500',
}
const PORTAL_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'New', approved: 'Approved',
  in_production: 'In Production', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
}

type TransLang = 'en' | 'pt' | 'nl' | 'fr' | 'de'
const LANG_LABEL: Record<TransLang, string> = {
  en: '🇬🇧 EN', pt: '🇵🇹 PT', nl: '🇳🇱 NL', fr: '🇫🇷 FR', de: '🇩🇪 DE',
}

export default function OrderDetailView({ order, isAdmin, prevId, nextId }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any; isAdmin: boolean; prevId?: string | null; nextId?: string | null
}) {
  const router = useRouter()
  const locale = useLocale()
  const base = isAdmin ? '/admin/orders' : '/orders'
  const [, start] = useTransition()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product = (Array.isArray(order.products) ? order.products[0] : order.products) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const company = (Array.isArray(order.companies) ? order.companies[0] : order.companies) as any

  const [piedroId,    setPiedroId]    = useState<string>(order.piedro_order_id ?? '')
  const [piedroNotes, setPiedroNotes] = useState<string>(order.piedro_notes ?? '')
  const [approvalSt,  setApprovalSt]  = useState<ApprovalState>(order.approval_state ?? 'registered')
  const [productionSt,setProductionSt]= useState<ProductionState | ''>(order.production_state ?? '')
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [msgErr, setMsgErr]   = useState(false)
  const [translation, setTranslation] = useState('')
  const [translating, setTranslating] = useState(false)
  const [transLang, setTransLang]     = useState<TransLang>('en')

  const unit  = order.unit ?? 'PAIR'
  const approvalMeta   = APPROVAL_STATES.find(s => s.value === approvalSt)
  const productionMeta = PRODUCTION_STATES.find(s => s.value === productionSt)
  // Production (and later invoice/tracking) only make sense once the order is approved
  // and handed to the factory — hide them for new orders awaiting validation.
  const isApprovedOrBeyond = approvalSt === 'approved'
    || ['approved', 'in_production', 'shipped', 'delivered'].includes(order.status)

  // Only allow confirming when something actually changed AND the Piedro Order is set.
  const dirty =
    piedroId     !== (order.piedro_order_id ?? '') ||
    piedroNotes  !== (order.piedro_notes ?? '') ||
    approvalSt   !== (order.approval_state ?? 'registered') ||
    productionSt !== (order.production_state ?? '')
  const canSave = dirty && piedroId.trim() !== '' && !saving

  // Different-sizes pairs (stored JSON) → string sizes for the shared summary.
  const diffSizesPairs = Array.isArray(order.diff_sizes_pairs)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (order.diff_sizes_pairs as any[]).map(p => ({ qty: p.qty ?? 1, size: p.size != null ? String(p.size) : '' }))
    : []

  // Translate targets: the viewer's locale first, then EN/PT as quick fallbacks.
  const transTargets = Array.from(new Set<TransLang>([locale as TransLang, 'en', 'pt']))

  async function handleSave(overrides?: Partial<Parameters<typeof updateOrderAdminAction>[1]>) {
    setSaving(true); setMsg(''); setMsgErr(false)
    const fields = { approval_state: approvalSt, production_state: productionSt || undefined, piedro_order_id: piedroId, piedro_notes: piedroNotes, ...overrides }
    const result = await updateOrderAdminAction(order.id, fields)
    setSaving(false)
    if (result.ok) { setMsg('Saved'); router.refresh() }
    else { setMsg(result.error ?? 'Error'); setMsgErr(true) }
  }

  async function handleTranslate(lang: TransLang) {
    setTransLang(lang); setTranslating(true)
    const text = [order.comments, order.clinician && `Clinician: ${order.clinician}`, order.patient_name && `Patient: ${order.patient_name}`].filter(Boolean).join('\n')
    const result = await translateTextAction(text, lang)
    setTranslation(result.translation ?? result.error ?? '')
    setTranslating(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

      {/* Side navigator — previous (newer) / next (older) order */}
      {prevId && (
        <Link href={`${base}/${prevId}` as Parameters<typeof Link>[0]['href']}
          aria-label="Previous order" title="Previous order"
          className="fixed left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-500 hover:text-gold hover:border-gold flex items-center justify-center transition-colors"
          style={{ boxShadow: 'var(--shadow-card)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </Link>
      )}
      {nextId && (
        <Link href={`${base}/${nextId}` as Parameters<typeof Link>[0]['href']}
          aria-label="Next order" title="Next order"
          className="fixed right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-500 hover:text-gold hover:border-gold flex items-center justify-center transition-colors"
          style={{ boxShadow: 'var(--shadow-card)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </Link>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-stone-400 mb-1">Order</p>
          <h1 className="text-2xl font-bold text-stone-900">{order.reference_customer ?? '—'}</h1>
          <p className="text-sm text-stone-500 mt-0.5">{new Date(order.created_at).toLocaleDateString(locale, { day:'2-digit', month:'long', year:'numeric' })}</p>
          {order.piedro_order_id && <p className="text-sm font-semibold text-stone-700 mt-1">Piedro Order: {order.piedro_order_id}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Single current state: production (VSI) > approval (Piedro) > portal status */}
          {productionMeta ? (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700">
              {productionMeta.label}
            </span>
          ) : approvalMeta && approvalSt !== 'registered' ? (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${approvalMeta.color}`}>
              {approvalMeta.label}
            </span>
          ) : (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${PORTAL_STATUS_BADGE[order.status] ?? 'bg-stone-100 text-stone-500'}`}>
              {PORTAL_STATUS_LABEL[order.status] ?? order.status}
            </span>
          )}
          {order.pdf_url && (
            <a href={order.pdf_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gold border border-gold/40 rounded-lg hover:bg-gold/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
              </svg>
              PDF
            </a>
          )}
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msgErr ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {msg}
        </div>
      )}

      {/* ── Admin panel (validation) ─────────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-white rounded-[14px] p-5 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Piedro Admin</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Piedro Order # */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">
                Piedro Order # <span className="text-red-400">*</span>
              </label>
              <input value={piedroId} onChange={e => setPiedroId(e.target.value)}
                placeholder="Required before approving"
                className="w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
            </div>

            {/* Internal notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">Internal Notes</label>
              <input value={piedroNotes} onChange={e => setPiedroNotes(e.target.value)}
                placeholder="Factory notes…"
                className="w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
            </div>
          </div>

          {/* Approval state */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">Approval State</label>
            <div className="flex flex-wrap gap-2">
              {APPROVAL_STATES.map(s => (
                <button key={s.value}
                  onClick={() => setApprovalSt(s.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all
                    ${approvalSt === s.value
                      ? `${s.color} border-current ring-2 ring-current/20`
                      : 'text-stone-500 border-stone-200 hover:border-stone-400 bg-white'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Production state — only once approved & handed to the factory */}
          {isApprovedOrBeyond && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">Production State</label>
              <div className="flex flex-wrap gap-2">
                {PRODUCTION_STATES.map(s => (
                  <button key={s.value}
                    onClick={() => setProductionSt(productionSt === s.value ? '' : s.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all
                      ${productionSt === s.value
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'text-stone-500 border-stone-200 hover:border-stone-400 bg-white'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => start(() => handleSave())} disabled={!canSave}
              className="px-6 py-2.5 bg-stone-800 text-white text-sm font-semibold rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving…' : 'CONFIRM changes'}
            </button>
            {dirty && !piedroId.trim() && (
              <span className="text-xs text-red-500">⚠ Piedro Order # is required to save.</span>
            )}
          </div>
        </div>
      )}

      {/* ── Order body — same structure as the registration Confirmation step ── */}
      <OrderSummary
        companyName={company?.name ?? '—'}
        clinician={order.clinician}
        patientName={order.patient_name}
        reference={order.reference_customer}
        product={product ?? {}}
        unit={unit}
        quantity={order.quantity}
        diffSizesPairs={diffSizesPairs}
        constrLeft={order.construction_left}
        constrRight={order.construction_right}
        widthLeft={order.width_left}
        widthRight={order.width_right}
        sizeLeft={order.size_left != null ? String(order.size_left) : ''}
        sizeRight={order.size_right != null ? String(order.size_right) : ''}
        additions={order.additions ?? null}
        comments={order.comments}
        showAdditions={unit !== 'DIFF_SIZES'}
        commentsFooter={isAdmin && order.comments ? (
          <div className="pt-2 border-t border-stone-50 space-y-2">
            <div className="flex flex-wrap gap-2">
              {transTargets.map(lang => (
                <button key={lang} onClick={() => start(() => handleTranslate(lang))} disabled={translating}
                  className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors disabled:opacity-50">
                  {translating && transLang === lang ? 'Translating…' : `Translate ${LANG_LABEL[lang]}`}
                </button>
              ))}
            </div>
            {translation && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-1">Translation ({transLang.toUpperCase()})</p>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{translation}</p>
              </div>
            )}
          </div>
        ) : undefined}
      />
    </div>
  )
}
