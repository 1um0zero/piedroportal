'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, Link } from '@/i18n/navigation'
import OrderSummary from './OrderSummary'
import { updateOrderAdminAction, translateTextAction } from '@/app/actions/admin-orders'
import { cancelOrderAction } from '@/app/actions/orders'
import { APPROVAL_STATES, PRODUCTION_STATES, type ApprovalState, type ProductionState } from '@/lib/order-status'
import { orderNumber } from '@/lib/format'

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

export default function OrderDetailView({ order, isAdmin, prevId, nextId, clientEmail = '', clientCc = '', deskEmail = '' }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any; isAdmin: boolean; prevId?: string | null; nextId?: string | null
  clientEmail?: string; clientCc?: string; deskEmail?: string
}) {
  const router = useRouter()
  const locale = useLocale()
  const tOrder = useTranslations('order')
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

  // Cancel (Piedro admin soft-cancel) — guarded behind a confirmation modal so it's
  // a deliberate action, not a stray click. Same rule the server re-enforces: not
  // yet in production, and currently a live order (new/approved, not a draft).
  const [showCancel, setShowCancel]   = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling]   = useState(false)
  const canCancel = isAdmin
    && !order.production_state
    && (order.status === 'submitted' || order.status === 'approved')

  async function handleCancel() {
    setCancelling(true); setMsg(''); setMsgErr(false)
    const res = await cancelOrderAction(order.id, cancelReason)
    setCancelling(false)
    if (res.error) { setMsg(res.error); setMsgErr(true); return }
    setShowCancel(false)
    router.refresh()
  }

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

  // "Email client" shortcut: opens the staff member's mail client pre-addressed to
  // the orderer (Cc the order desk + company), referencing the Piedro Order so a
  // question about this order can go out in one click. No patient data in subject.
  const emailRef = (piedroId || (order.order_seq != null ? `#${orderNumber(order.order_seq)}` : '') || order.reference_customer || order.id?.slice(0, 8)) ?? ''
  const mailtoCc = [deskEmail, clientCc].map(s => (s ?? '').trim()).filter(Boolean).join(',')
  const mailtoHref = clientEmail
    ? `mailto:${encodeURIComponent(clientEmail)}?` + [
        `subject=${encodeURIComponent(tOrder('email_client_subject', { ref: emailRef }))}`,
        mailtoCc ? `cc=${encodeURIComponent(mailtoCc)}` : '',
        `body=${encodeURIComponent(tOrder('email_client_body', { ref: emailRef }))}`,
      ].filter(Boolean).join('&')
    : null

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

  // Order number + creation date — shown at the top of the Customer card.
  const createdLabel = new Date(order.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })
  const orderNoNode = (
    <div className="-mt-1 mb-1">
      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{tOrder('order_number_label')}</p>
      <p className="text-lg font-bold text-stone-900 tabular-nums">
        {order.order_seq != null ? `#${orderNumber(order.order_seq)}` : (order.reference_customer ?? '—')}
        <span className="ml-2 text-sm font-normal text-stone-400">— {createdLabel}</span>
      </p>
    </div>
  )

  // ── Admin validation panel — rendered directly under the Customer card.
  // Piedro Order # + Approval sit side by side; production shows the current stage
  // read-only (it is driven by the ERP/A-Shell, never set by hand here); Internal
  // Notes is hidden for now (the column is kept in the DB and saved untouched).
  const adminPanel = isAdmin ? (
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

        {/* Approval state — dropdown to the right of Piedro Order # */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">Approval State</label>
          <select value={approvalSt} onChange={e => setApprovalSt(e.target.value as ApprovalState)}
            className="w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold">
            {APPROVAL_STATES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Production state — read-only current stage (set by the factory via the ERP) */}
      {isApprovedOrBeyond && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">Production State</label>
          <div>
            {productionMeta ? (
              <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700">
                {productionMeta.label}
              </span>
            ) : (
              <span className="text-xs text-stone-400">—</span>
            )}
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
  ) : null

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

      {/* Top action bar — the order number + date now live inside the Customer card
          (OrderSummary headingNode); Piedro Order # and Approval live in the admin
          panel below, so the header carries only the actions + current status. */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
          {/* A draft is unfinished — let the owner reopen it in the order form to
              edit and actually submit it (the detail view itself is read-only). */}
          {!isAdmin && order.status === 'draft' && product?.id && (
            <Link href={`/gallery/${product.id}/order?draft=${order.id}` as Parameters<typeof Link>[0]['href']}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gold rounded-lg hover:bg-gold-dark transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
              </svg>
              {tOrder('edit_draft')}
            </Link>
          )}
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
          {isAdmin && mailtoHref && (
            <a href={mailtoHref}
              title={clientEmail}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 border border-stone-300 rounded-lg hover:border-gold hover:text-gold-dark transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/>
              </svg>
              {tOrder('email_client')}
            </a>
          )}
          {canCancel && (
            <button onClick={() => { setCancelReason(''); setShowCancel(true) }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {tOrder('cancel_order')}
            </button>
          )}
          {order.pdf_url ? (
            <a href={order.pdf_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gold border border-gold/40 rounded-lg hover:bg-gold/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
              </svg>
              PDF
            </a>
          ) : (
            // No stored PDF → migrated order. Generate a watermarked reproduction on demand.
            <a href={`/api/orders/${order.id}/pdf`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-500 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
              </svg>
              {tOrder('pdf_migrated')}
            </a>
          )}
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msgErr ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {msg}
        </div>
      )}

      {/* ── Order body — Customer card (with the order nº + the admin panel right
          under it) followed by Specifications and Additions, same structure as the
          registration Confirmation step. ── */}
      <OrderSummary
        headingNode={orderNoNode}
        afterCustomer={adminPanel}
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

      {/* ── Cancel confirmation modal ─────────────────────────────────────── */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40"
          onClick={() => !cancelling && setShowCancel(false)}>
          <div className="bg-white rounded-[14px] max-w-md w-full p-6 space-y-4"
            style={{ boxShadow: 'var(--shadow-card)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5 w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </span>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-stone-900">{tOrder('cancel_modal_title')}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{tOrder('cancel_modal_body')}</p>
                <p className="text-xs text-stone-500 leading-relaxed bg-stone-50 border border-stone-100 rounded-lg p-2.5">
                  {tOrder('cancel_modal_revert')}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">{tOrder('cancel_reason_label')}</label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                rows={2} placeholder={tOrder('cancel_reason_placeholder')}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none" />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setShowCancel(false)} disabled={cancelling}
                className="px-4 py-2 text-sm font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50">
                {tOrder('cancel_keep_btn')}
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                {cancelling ? tOrder('cancelling') : tOrder('cancel_confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
