'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, Link } from '@/i18n/navigation'
import OrderSummary from './OrderSummary'
import PiedroAdditionsLayer from './PiedroAdditionsLayer'
import { updateOrderAdminAction, translateTextAction, reopenOrderAction, undoReopenAction } from '@/app/actions/admin-orders'
import { cancelOrderAction, cancelReopenedOrderAction } from '@/app/actions/orders'
import { APPROVAL_STATES, PRODUCTION_STATES, type ApprovalState, type ProductionState } from '@/lib/order-status'
import { orderNumber } from '@/lib/format'

const PORTAL_STATUS_BADGE: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-500', submitted: 'bg-blue-50 text-blue-600',
  changes_requested: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700', in_production: 'bg-amber-50 text-amber-700',
  shipped: 'bg-violet-50 text-violet-700', delivered: 'bg-teal-50 text-teal-700',
  cancelled: 'bg-red-50 text-red-500',
}
const PORTAL_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'New', changes_requested: 'Changes requested', approved: 'Approved',
  in_production: 'In Production', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
}

type TransLang = 'en' | 'pt' | 'nl' | 'fr' | 'de'
const LANG_LABEL: Record<TransLang, string> = {
  en: '🇬🇧 EN', pt: '🇵🇹 PT', nl: '🇳🇱 NL', fr: '🇫🇷 FR', de: '🇩🇪 DE',
}

export default function OrderDetailView({ order, isAdmin, readOnly = false, isFullAdmin = false, canEditDraft = false, canEditReopened = false, prevId, nextId, clientEmail = '', clientCc = '', deskEmail = '', replacesRef = null, replacedByRef = null }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any; isAdmin: boolean; readOnly?: boolean; isFullAdmin?: boolean; canEditDraft?: boolean; canEditReopened?: boolean; prevId?: string | null; nextId?: string | null
  clientEmail?: string; clientCc?: string; deskEmail?: string
  /** Replacement chain: this order replaces / was replaced by another one. */
  replacesRef?: { id: string; label: string } | null
  replacedByRef?: { id: string; label: string } | null
}) {
  const router = useRouter()
  const locale = useLocale()
  const tOrder = useTranslations('order')
  const base = isAdmin ? '/admin/orders' : '/orders'
  // The admin layout (full fields, neighbours) is gated by isAdmin; the WRITE
  // controls additionally require canEdit — a staff_viewer (or branch_staff) opens
  // the same detail read-only. Server actions already reject their writes; this
  // just keeps dead controls off the screen.
  const canEdit = isAdmin && !readOnly
  const [, start] = useTransition()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product = (Array.isArray(order.products) ? order.products[0] : order.products) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const company = (Array.isArray(order.companies) ? order.companies[0] : order.companies) as any

  const [piedroId,    setPiedroId]    = useState<string>(order.piedro_order_id ?? '')
  // Internal notes is hidden in the UI for now (kept in the DB, saved untouched);
  // production state is read-only here (driven by the ERP) — both keep their value
  // without a setter so the saved payload is unchanged.
  const [piedroNotes] = useState<string>(order.piedro_notes ?? '')
  const [approvalSt,  setApprovalSt]  = useState<ApprovalState>(order.approval_state ?? 'registered')
  const [productionSt] = useState<ProductionState | ''>(order.production_state ?? '')
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
  // Soft-cancel is a piedro_admin-only intervention (the server enforces the same).
  // An orders_approval branch_staff may approve but NOT cancel — keep the button off.
  const canCancel = canEdit
    && isFullAdmin
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

  // Reopen for client edits ("request changes") — anyone with the approval
  // capability, over the same window as cancel: a live order production has not
  // touched. If the VSI console already imported the order (erp_exported_at) the
  // modal carries an extra warning — the console holds a stale version until the
  // client re-submits (which clears the flag so the console re-imports).
  const [showReopen, setShowReopen]     = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [reopening, setReopening]       = useState(false)
  // 'order_received' = the VSI console imported it (stage 0) — still reopenable,
  // with the reinforced ERP warning; any later stage means the factory started.
  const consoleOnly = order.production_state === 'order_received'
  const canReopen = canEdit
    && (!order.production_state || consoleOnly)
    && (order.status === 'submitted' || order.status === 'approved'
      || (order.status === 'in_production' && consoleOnly))
  const isReopened = order.status === 'changes_requested'

  async function handleReopen() {
    setReopening(true); setMsg(''); setMsgErr(false)
    const res = await reopenOrderAction(order.id, reopenReason)
    setReopening(false)
    if (res.error) { setMsg(res.error); setMsgErr(true); return }
    setShowReopen(false)
    if (res.emailError) { setMsg(`${tOrder('reopen_done_email_failed')} (${res.emailError})`); setMsgErr(true) }
    router.refresh()
  }

  async function handleUndoReopen() {
    setReopening(true); setMsg(''); setMsgErr(false)
    const res = await undoReopenAction(order.id)
    setReopening(false)
    if (res.error) { setMsg(res.error); setMsgErr(true); return }
    router.refresh()
  }

  // Client-side cancel of a reopened order (instead of correcting it) — the one
  // exception to "clients can't cancel after Piedro intervened". Soft cancel.
  const [showClientCancel, setShowClientCancel] = useState(false)
  const [clientCancelling, setClientCancelling] = useState(false)

  async function handleClientCancel() {
    setClientCancelling(true); setMsg(''); setMsgErr(false)
    const res = await cancelReopenedOrderAction(order.id)
    setClientCancelling(false)
    if (res.error) { setMsg(res.error); setMsgErr(true); return }
    setShowClientCancel(false)
    router.refresh()
  }

  const unit  = order.unit ?? 'PAIR'
  const approvalMeta   = APPROVAL_STATES.find(s => s.value === approvalSt)
  const productionMeta = PRODUCTION_STATES.find(s => s.value === productionSt)

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

  // Order number + creation date — head of the full-width top card.
  const createdLabel = new Date(order.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })

  // ── Full-width top card: order nº + date on the left; for admins, the editable
  // Piedro Order # + Approval State + Save on the right. Production state is NOT
  // edited here (it is driven by the ERP/A-Shell — shown as a badge in the header);
  // Internal Notes is hidden for now (column kept in the DB and saved untouched).
  const topCard = (
    <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-end justify-between gap-x-6 gap-y-4 flex-wrap">
        {/* Order nº + date */}
        <div>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{tOrder('order_number_label')}</p>
          <p className="text-xl font-bold text-stone-900 tabular-nums">
            {order.order_seq != null ? `#${orderNumber(order.order_seq)}` : (order.reference_customer ?? '—')}
            <span className="ml-2 text-sm font-normal text-stone-400">— {createdLabel}</span>
          </p>
          {/* Replacement chain — a corrected order and its cancelled original
              reference each other so the trail reads in one glance. */}
          {replacesRef && (
            <p className="text-xs text-stone-500 mt-1">
              {tOrder('replaces_label')}{' '}
              <Link href={`${base}/${replacesRef.id}` as Parameters<typeof Link>[0]['href']}
                className="font-semibold text-gold hover:underline tabular-nums">{replacesRef.label}</Link>
            </p>
          )}
          {replacedByRef && (
            <p className="text-xs text-amber-700 mt-1">
              {tOrder('replaced_by_label')}{' '}
              <Link href={`${base}/${replacedByRef.id}` as Parameters<typeof Link>[0]['href']}
                className="font-semibold text-gold hover:underline tabular-nums">{replacedByRef.label}</Link>
            </p>
          )}
        </div>

        {/* Admin: Piedro Order # + Approval + Save */}
        {canEdit && (
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-600 uppercase tracking-wide">
                Piedro Order # <span className="text-red-400">*</span>
              </label>
              <input value={piedroId} onChange={e => setPiedroId(e.target.value)}
                placeholder="Required before approving"
                className="w-44 h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-600 uppercase tracking-wide">Approval State</label>
              <select value={approvalSt} onChange={e => setApprovalSt(e.target.value as ApprovalState)}
                className="w-48 h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold">
                {APPROVAL_STATES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <button onClick={() => start(() => handleSave())} disabled={!canSave}
              title={dirty && !piedroId.trim() ? 'Piedro Order # is required to save.' : undefined}
              className="h-9 px-6 bg-stone-800 text-white text-sm font-semibold rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Track & Trace — shown to staff and client alike once the ERP has sent a
          tracking code/link (only populated for delivered orders). The list shows
          it in the Delivery column; here it lives on the order itself. */}
      {(order.tracking_link || order.tracking_code) && (
        <div className="mt-4 pt-4 border-t border-stone-100">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">{tOrder('tracking_label')}</p>
          {order.tracking_link ? (
            <a href={order.tracking_link} target="_blank" rel="noopener noreferrer"
              title={tOrder('tracking_open')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>
              </svg>
              <span className="tabular-nums">{order.tracking_code ?? tOrder('tracking_open')}</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-stone-700 tabular-nums">{order.tracking_code}</span>
          )}
        </div>
      )}
    </div>
  )

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

      {/* Top action bar — the order nº + date and the editable Piedro Order # /
          Approval live in the full-width card below; the header carries only the
          actions + the current state badge(s). */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
          {/* A draft is unfinished — let the owner reopen it in the order form to
              edit and actually submit it (the detail view itself is read-only).
              Back-office viewers get the same affordance ONLY for their own drafts
              (canEditDraft, set by the admin detail page). */}
          {(!isAdmin || canEditDraft) && order.status === 'draft' && product?.id && (
            <Link href={`/gallery/${product.id}/order?draft=${order.id}` as Parameters<typeof Link>[0]['href']}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gold rounded-lg hover:bg-gold-dark transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
              </svg>
              {tOrder('edit_draft')}
            </Link>
          )}
          {/* Reopened for edits — the owner continues in the order form. */}
          {canEditReopened && product?.id && (
            <Link href={`/gallery/${product.id}/order?draft=${order.id}` as Parameters<typeof Link>[0]['href']}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gold rounded-lg hover:bg-gold-dark transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
              </svg>
              {tOrder('reopen_edit_btn')}
            </Link>
          )}
          {canEditReopened && (
            <button onClick={() => setShowClientCancel(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              {tOrder('cancel_order')}
            </button>
          )}
          {/* Current state: the Piedro approval (or portal status) badge, plus the
              production stage badge alongside it whenever the factory has set one.
              A reopened order always shows its portal state — the stored approval
              state is only the memory undoReopenAction restores from. */}
          {approvalMeta && approvalSt !== 'registered' && !isReopened ? (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${approvalMeta.color}`}>
              {approvalMeta.label}
            </span>
          ) : (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${PORTAL_STATUS_BADGE[order.status] ?? 'bg-stone-100 text-stone-500'}`}>
              {PORTAL_STATUS_LABEL[order.status] ?? order.status}
            </span>
          )}
          {productionMeta && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700">
              {productionMeta.label}
            </span>
          )}
          {canEdit && mailtoHref && (
            <a href={mailtoHref}
              title={clientEmail}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 border border-stone-300 rounded-lg hover:border-gold hover:text-gold-dark transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/>
              </svg>
              {tOrder('email_client')}
            </a>
          )}
          {canReopen && (
            <button onClick={() => { setReopenReason(''); setShowReopen(true) }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
              </svg>
              {tOrder('reopen_btn')}
            </button>
          )}
          {isReopened && canEdit && (
            <button onClick={() => start(() => handleUndoReopen())} disabled={reopening}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50">
              {reopening ? tOrder('reopen_undoing') : tOrder('reopen_undo_btn')}
            </button>
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

      {/* Reopened banner — staff asked the client for changes; the creator gets
          the edit CTA (canEditReopened), everyone else sees the state + reason. */}
      {isReopened && (
        <div className="bg-amber-50 border border-amber-200 rounded-[14px] p-4 flex items-start gap-3">
          <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-800">{tOrder('reopen_banner_title')}</p>
            <p className="text-sm text-amber-800/90 mt-0.5">
              {canEditReopened ? tOrder('reopen_banner_body_owner') : tOrder('reopen_banner_body')}
            </p>
            {order.reopen_reason && (
              <p className="text-sm text-amber-900 font-medium mt-2 whitespace-pre-wrap bg-white/60 border border-amber-100 rounded-lg px-3 py-2">
                {order.reopen_reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Full-width card: order nº + date (+ admin edit fields) */}
      {topCard}

      {/* ── Order body — Customer card + photo, Specifications and Additions, same
          structure as the registration Confirmation step. ── */}
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

      {/* ── Piedro additions layer — staff-only. Lets approvers transcribe an
          amendment from the comment into the structured additions WITHOUT
          touching the client's submission; this override feeds the VSI import.
          Never rendered on the client-facing order page (isAdmin === false). ── */}
      {isAdmin && unit !== 'DIFF_SIZES' && (
        <PiedroAdditionsLayer order={order} product={product ?? {}} unit={unit} canEdit={canEdit} />
      )}

      {/* ── Client cancel (reopened order) confirmation modal ─────────────── */}
      {showClientCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40"
          onClick={() => !clientCancelling && setShowClientCancel(false)}>
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
                <h3 className="text-base font-bold text-stone-900">{tOrder('client_cancel_modal_title')}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{tOrder('client_cancel_modal_body')}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setShowClientCancel(false)} disabled={clientCancelling}
                className="px-4 py-2 text-sm font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50">
                {tOrder('cancel_keep_btn')}
              </button>
              <button onClick={handleClientCancel} disabled={clientCancelling}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                {clientCancelling ? tOrder('cancelling') : tOrder('cancel_confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reopen ("request changes") confirmation modal ─────────────────── */}
      {showReopen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40"
          onClick={() => !reopening && setShowReopen(false)}>
          <div className="bg-white rounded-[14px] max-w-md w-full p-6 space-y-4"
            style={{ boxShadow: 'var(--shadow-card)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5 w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
                </svg>
              </span>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-stone-900">{tOrder('reopen_modal_title')}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{tOrder('reopen_modal_body')}</p>
                {/* The VSI console already imported this order — until the client
                    re-submits, the console holds the OLD version. Confirm with VSI. */}
                {(order.erp_exported_at || consoleOnly) && (
                  <p className="text-xs text-amber-800 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-2.5 font-medium">
                    {tOrder('reopen_modal_erp_warning')}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 uppercase tracking-wide">
                {tOrder('reopen_reason_label')} <span className="text-red-400">*</span>
              </label>
              <textarea value={reopenReason} onChange={e => setReopenReason(e.target.value)}
                rows={3} placeholder={tOrder('reopen_reason_placeholder')}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold resize-none" />
              <p className="text-[11px] text-stone-400">{tOrder('reopen_reason_hint')}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setShowReopen(false)} disabled={reopening}
                className="px-4 py-2 text-sm font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50">
                {tOrder('cancel_keep_btn')}
              </button>
              <button onClick={handleReopen} disabled={reopening || !reopenReason.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50">
                {reopening ? tOrder('reopen_confirming') : tOrder('reopen_confirm_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

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
