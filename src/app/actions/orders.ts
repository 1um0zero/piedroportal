'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin as isPiedroAdminRole } from '@/lib/roles'
import { getAdminScope } from '@/lib/admin/scope'
import { logAdminAction } from '@/lib/admin/audit'
import { getImpersonation } from '@/lib/impersonation'
import { getUserCompanyIds } from '@/lib/user-companies'
import { getBranchAdminCompanyIds } from '@/lib/branch-admin'
import { getSettings } from '@/lib/settings'
import { getBranchNotifyTargets } from '@/lib/admin/branch-recipients'
import { escapeHtml } from '@/lib/escape-html'
import { displayWidthByConstruction } from '@/lib/width-display'
import { addWorkingDays } from '@/lib/dispatch'
import { orderNumber } from '@/lib/format'
import { getTranslations } from 'next-intl/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { Resend } from 'resend'
import React from 'react'

// Lazily create the Resend client so a missing key never crashes module load.
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}
// Recipients/sender are configured by the admin in /admin/settings (app_settings),
// falling back to env vars. No dev fallback: if neither is set we SKIP sending
// rather than misdeliver order data to a personal/sandbox address.
//   order_notify_email / ORDER_NOTIFY_EMAIL — Piedro's order desk recipient
//   email_from / EMAIL_FROM — a Piedro-owned, Resend-verified sender
import { OrderPdf, type OrderPdfProps } from '@/components/order/OrderPdf'


export type OrderRow = {
  user_id:            string
  company_id:         string | null
  locale:             string
  product_id:         string
  status:             string
  unit:               string
  clinician:          string | null
  patient_name:       string | null
  reference_customer: string | null
  quantity:           number
  construction_left:  string | null
  construction_right: string | null
  width_left:         string | null
  width_right:        string | null
  size_left:          number | null
  size_right:         number | null
  additions:          Record<string, unknown>
  comments:           string | null
  diff_sizes_pairs:   Array<{ qty: number; size: number }> | null
}

export type PdfMeta = {
  productColourId:  string
  productColorName: string
  productClosure:   string
  productImageUrl?: string
  companyName:      string
}

/**
 * Expected dispatch date = order day + N working days (settings, normal vs urgent),
 * skipping weekends, PT holidays and factory closures. Computed once at submit so
 * /orders stays cheap; recomputed in bulk only when the closure calendar changes.
 */
async function computeDispatchDate(
  service: ReturnType<typeof createServiceClient>,
  status: string,
  additions: unknown,
): Promise<string | null> {
  if (status !== 'submitted') return null
  const s = await getSettings(['dispatch_days_normal', 'dispatch_days_urgent'])
  const normal = parseInt(s.dispatch_days_normal || '0', 10) || 0
  const urgent = parseInt(s.dispatch_days_urgent || '0', 10) || normal
  const isUrgent = (additions as { urgent?: boolean } | null)?.urgent === true
  const days = isUrgent ? urgent : normal
  if (!days) return null
  const { data: cl } = await service.from('factory_closures').select('date')
  const closures = new Set((cl ?? []).map(r => (r as { date: string }).date))
  return addWorkingDays(new Date().toISOString(), days, closures)
}

/**
 * Pull the next global order number from the order_seq_counter sequence. Called
 * once, atomically, when an order is SUBMITTED (never for drafts) so the visible
 * sequence stays gap-free. Continues the legacy Dataverse "NNNN" numbering. A null
 * result (RPC missing/migration not run) must not block the order — the number is
 * a label, not a gate.
 */
async function nextOrderSeq(service: ReturnType<typeof createServiceClient>): Promise<number | null> {
  const { data, error } = await service.rpc('next_order_number')
  if (error) { console.error('next_order_number RPC failed:', error.message); return null }
  return typeof data === 'number' ? data : null
}

/**
 * When the acting user is an admin impersonating someone (act-as), record the
 * data change in the audit trail attributed to the REAL admin on behalf of the
 * target. No-op for ordinary users. The order mutation itself already runs under
 * the target's session, so this is purely the on-behalf paper trail.
 */
async function logOnBehalf(action: string, orderId: string | null, details?: Record<string, unknown>): Promise<void> {
  const imp = await getImpersonation()
  if (!imp) return
  await logAdminAction({
    actorId: imp.adminId, actorRole: 'piedro_admin',
    action, orderId, impersonatedAsUserId: imp.targetId,
    details: { target_name: imp.targetName, ...details },
  })
}

export async function insertOrderAction(
  row:     OrderRow,
  pdfMeta?: PdfMeta,   // provided only when status === 'submitted'
): Promise<{ id?: string; pdf_url?: string; error?: string; pdfError?: string; emailError?: string }> {

  // Verify session server-side
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Users may only create draft or submitted orders — never set an elevated
  // status (approved/in_production/…) directly. Those transitions are admin-only.
  if (row.status !== 'draft' && row.status !== 'submitted') {
    return { error: 'Invalid order status' }
  }

  // Validate company ownership: a non-admin can only order for a company they
  // belong to (user_companies). Piedro admins may order on behalf of any company.
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  const isPiedroAdmin = isPiedroAdminRole(profile?.role)
  if (!isPiedroAdmin) {
    // A user may order for a company they belong to (user_companies) OR, as a
    // branch admin, for any client linked to a branch office they administer.
    const [ownIds, branchIds] = await Promise.all([
      getUserCompanyIds(user.id),
      getBranchAdminCompanyIds(user.id),
    ])
    const allowed = new Set([...ownIds, ...branchIds])
    if (!row.company_id || !allowed.has(row.company_id)) {
      return { error: 'You do not have access to this company' }
    }
  }

  // Use service role for DB operations — avoids PGRST116 after INSERT + RLS SELECT mismatch.
  // user_id and status are forced server-side and never trusted from the client.
  const service = createServiceClient()
  const expected_dispatch_date = await computeDispatchDate(service, row.status, row.additions)
  // A submitted order gets its sequential number now; a draft stays unnumbered.
  const order_seq = row.status === 'submitted' ? await nextOrderSeq(service) : null
  const { data, error } = await service
    .from('orders')
    .insert({ ...row, user_id: user.id, status: row.status, expected_dispatch_date, order_seq })
    .select('id')
    .single()

  // Confirm an effective commit: only a row id coming back from the DB proves the
  // order is persisted. PDF/email (the system's proof of registration) are
  // generated ONLY after this confirmation, never before.
  if (error || !data?.id) {
    return { error: error ? `${error.message} [${error.code}]` : 'The order could not be saved.' }
  }
  const orderId: string = data.id
  await logOnBehalf(`order_${row.status === 'submitted' ? 'submit' : 'draft'}_on_behalf`, orderId, { company_id: row.company_id })

  if (row.status === 'submitted' && pdfMeta) {
    const pdfResult = await generatePdf(orderId, row, pdfMeta, service, user.id, user.email, order_seq)
    return { id: orderId, ...pdfResult }
  }
  return { id: orderId }
}

// ── Email helpers ──────────────────────────────────────────────────────────────
type EmailT = Awaited<ReturnType<typeof getTranslations<'emails'>>>
const splitEmails = (s?: string | null) =>
  (s ?? '').split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
const uniq = (arr: string[]) => [...new Set(arr.map(e => e.toLowerCase()))]

function orderEmailHtml(t: EmailT, heading: string, ref: string, company: string, patient: string, model: string, intro?: string, customerReply?: string) {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
    <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A96E;margin:0 0 24px">Piedro Portal</p>
    <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 ${intro ? '12' : '20'}px">${escapeHtml(heading)}</h2>
    ${intro ? `<p style="font-size:14px;color:#44403C;margin:0 0 20px">${escapeHtml(intro)}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#44403C">
      <tr><td style="padding:8px 0;color:#78716C;width:120px">${escapeHtml(t('label_reference'))}</td><td style="padding:8px 0;font-weight:500">${escapeHtml(ref)}</td></tr>
      <tr><td style="padding:8px 0;color:#78716C">${escapeHtml(t('label_company'))}</td><td style="padding:8px 0;font-weight:500">${escapeHtml(company)}</td></tr>
      <tr><td style="padding:8px 0;color:#78716C">${escapeHtml(t('label_patient'))}</td><td style="padding:8px 0">${escapeHtml(patient)}</td></tr>
      <tr><td style="padding:8px 0;color:#78716C">${escapeHtml(t('label_model'))}</td><td style="padding:8px 0">${escapeHtml(model)}</td></tr>
    </table>
    ${customerReply ? `<div style="margin-top:20px;padding:12px 16px;background:#FAF8F4;border-left:3px solid #C9A96E;border-radius:6px">
      <p style="font-size:12px;color:#78716C;margin:0 0 4px">${escapeHtml(t('reply_to_customer'))}</p>
      <p style="font-size:14px;font-weight:500;color:#1C1917;margin:0"><a href="mailto:${escapeHtml(customerReply)}" style="color:#9A7A42;text-decoration:none">${escapeHtml(customerReply)}</a></p>
    </div>` : ''}
    <p style="font-size:12px;color:#A8A29E;margin-top:24px">${escapeHtml(t('pdf_attached'))}</p>
  </div>`
}

// ── Shared PDF generation helper ──────────────────────────────────────────────
async function generatePdf(orderId: string, row: OrderRow, pdfMeta: PdfMeta, service: ReturnType<typeof createServiceClient>, userId: string, userEmail?: string, orderSeq?: number | null): Promise<{ pdf_url?: string; pdfError?: string; emailError?: string }> {
  try {
    // Translate the categorical values (closure, constructions) into the order's
    // locale for the PDF — same DB translations the gallery uses.
    const loc = row.locale
    const trKeys = [pdfMeta.productClosure, row.construction_left, row.construction_right]
      .filter((v): v is string => !!v)
    const trMap: Record<string, string> = {}
    if (trKeys.length) {
      const { data: trs } = await service.from('translations').select('key, en, nl, fr, de').in('key', trKeys)
      for (const r of trs ?? []) {
        const v = (r as Record<string, string | null>)[loc] || r.en || r.key
        if (v) trMap[r.key] = v
      }
    }
    const tr = (v: string | null) => (v && trMap[v]) || v

    const pdfProps: OrderPdfProps = {
      reference: row.reference_customer,
      orderNumber: orderSeq != null ? `#${orderNumber(orderSeq)}` : null,
      status: row.status, unit: row.unit,
      clinician: row.clinician, patient_name: row.patient_name, quantity: row.quantity,
      construction_left: tr(row.construction_left), construction_right: tr(row.construction_right),
      width_left: row.width_left ? displayWidthByConstruction(row.width_left, row.construction_left, loc) : row.width_left,
      width_right: row.width_right ? displayWidthByConstruction(row.width_right, row.construction_right, loc) : row.width_right,
      size_left: row.size_left, size_right: row.size_right,
      additions: row.additions, comments: row.comments,
      created_at: new Date().toISOString(),
      companyName: pdfMeta.companyName, productColourId: pdfMeta.productColourId,
      productColorName: pdfMeta.productColorName, productClosure: tr(pdfMeta.productClosure) ?? pdfMeta.productClosure,
      productImageUrl: pdfMeta.productImageUrl,
      diff_sizes_pairs: row.diff_sizes_pairs,
      locale: row.locale as 'en' | 'nl' | 'fr' | 'de',
    }
    const element = React.createElement(OrderPdf, pdfProps) as unknown as Parameters<typeof renderToBuffer>[0]
    const pdfBytes = Buffer.from(await renderToBuffer(element))
    const { error: uploadErr } = await service.storage
      .from('order-pdfs')
      .upload(`${orderId}.pdf`, pdfBytes, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) return { pdfError: `Storage: ${uploadErr.message}` }
    // Store the storage PATH (not a public URL) — the bucket is private and
    // access is via short-lived signed URLs generated at view time. The column
    // also serves as the "a PDF exists" flag in the order lists.
    const pdfPath = `${orderId}.pdf`
    await service.from('orders').update({ pdf_url: pdfPath }).eq('id', orderId)

    // ── Emails ──────────────────────────────────────────────────────────────
    // Two localized emails: (1) internal notification to the Piedro order desk
    // (in the admin-set locale), (2) confirmation to the ordering user (in the
    // order's locale) with optional user/company Cc/Bcc. All values HTML-escaped.
    // The portal order number is the canonical visible reference; fall back to the
    // client's own reference, then a short id slice for very old/edge rows.
    const ref     = (orderSeq != null ? `#${orderNumber(orderSeq)}` : null) ?? row.reference_customer ?? orderId.slice(0, 8)
    const patient = row.patient_name ?? '—'
    const resend = getResend()
    if (!resend) return { pdf_url: pdfPath, emailError: 'Email service not configured (RESEND_API_KEY missing)' }
    // Everything the three emails need, fetched concurrently — settings, the
    // client's Cc/Bcc contacts and the product style (for branch copies).
    const [cfg, { data: prof }, { data: comp }, { data: prod }] = await Promise.all([
      getSettings(['order_notify_email', 'email_from', 'notify_locale']),
      service.from('profiles').select('notify_cc, notify_bcc').eq('id', userId).single(),
      row.company_id
        ? service.from('companies').select('notify_cc, notify_bcc').eq('id', row.company_id).single()
        : Promise.resolve({ data: null as { notify_cc?: string; notify_bcc?: string } | null }),
      service.from('products').select('style_name').eq('id', row.product_id).single(),
    ])
    // The order-desk setting may hold a comma-separated list of addresses.
    const toEmails  = splitEmails(cfg.order_notify_email)
    const emailFrom = cfg.email_from
    if (!emailFrom || (!toEmails.length && !userEmail)) {
      return { pdf_url: pdfPath, emailError: 'Email not sent: set sender/recipient in Admin → Settings' }
    }

    const attachment = { filename: `order-${ref}.pdf`, content: pdfBytes.toString('base64') }
    const internalLocale = (cfg.notify_locale ?? 'en') as 'en' | 'nl' | 'fr' | 'de'
    const orderLocale    = (row.locale ?? 'en') as 'en' | 'nl' | 'fr' | 'de'
    const errors: string[] = []
    const internalSet = new Set(toEmails.map(e => e.toLowerCase()))
    // The emails are independent of each other — send them concurrently. Each
    // records its own failure; one bad address never blocks the others.
    const sends: Promise<void>[] = []

    // (1) Internal notification to the order desk. The client is NOT Cc'd here
    // (that caused the client to receive two messages per order — this internal
    // one plus their own confirmation below). Instead the client's address is
    // shown in the body ("reply to customer here") and set as Reply-To, so the
    // desk can still reply straight to the client without duplicating the email.
    if (toEmails.length) {
      sends.push((async () => {
        const customerReply = userEmail && !internalSet.has(userEmail.toLowerCase())
          ? userEmail : undefined
        const t = await getTranslations({ locale: internalLocale, namespace: 'emails' })
        const { error } = await resend.emails.send({
          from: emailFrom, to: toEmails,
          replyTo: customerReply,
          subject: t('subject_internal', { ref }),
          html: orderEmailHtml(t, t('heading_internal'), ref, pdfMeta.companyName, patient, pdfMeta.productColourId, undefined, customerReply),
          attachments: [attachment],
        })
        if (error) errors.push(`internal: ${error.message}`)
      })())
    }

    // (2) Confirmation to the ordering user (+ user/company Cc/Bcc).
    if (userEmail) {
      sends.push((async () => {
        const cc  = uniq([...splitEmails(prof?.notify_cc),  ...splitEmails(comp?.notify_cc)]).filter(e => e !== userEmail.toLowerCase())
        const bcc = uniq([...splitEmails(prof?.notify_bcc), ...splitEmails(comp?.notify_bcc)])
        const t = await getTranslations({ locale: orderLocale, namespace: 'emails' })
        const { error } = await resend.emails.send({
          from: emailFrom, to: [userEmail],
          // Replies (e.g. "I forgot to add something to my order") must reach the
          // order desk / customer service, not the no-reply From address.
          replyTo: toEmails.length ? toEmails : undefined,
          cc:  cc.length  ? cc  : undefined,
          bcc: bcc.length ? bcc : undefined,
          subject: t('subject_client', { ref }),
          html: orderEmailHtml(t, t('heading_client'), ref, pdfMeta.companyName, patient, pdfMeta.productColourId, t('client_intro')),
          attachments: [attachment],
        })
        if (error) errors.push(`client: ${error.message}`)
      })())
    }

    // (3) Branch-office copies — each relevant branch in its OWN language.
    sends.push((async () => {
      const branchTargets = (await getBranchNotifyTargets(prod?.style_name))
        .filter(bt => !internalSet.has(bt.email.toLowerCase()))
      await Promise.all(branchTargets.map(async bt => {
        const t = await getTranslations({ locale: bt.locale, namespace: 'emails' })
        const { error } = await resend.emails.send({
          from: emailFrom, to: [bt.email],
          subject: t('subject_internal', { ref }),
          html: orderEmailHtml(t, t('heading_internal'), ref, pdfMeta.companyName, patient, pdfMeta.productColourId),
          attachments: [attachment],
        })
        if (error) errors.push(`branch ${bt.email}: ${error.message}`)
      }))
    })())
    await Promise.all(sends)

    if (errors.length) {
      console.error('Email error:', errors.join(' | '))
      return { pdf_url: pdfPath, emailError: errors.join(' | ') }
    }
    return { pdf_url: pdfPath }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('PDF error:', msg)
    return { pdfError: msg }
  }
}

// ── Update existing order (draft → submit or re-save) ─────────────────────────
export async function updateOrderAction(
  draftId: string,
  row: OrderRow,
  pdfMeta?: PdfMeta,
): Promise<{ id?: string; pdf_url?: string; error?: string; pdfError?: string; emailError?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Users may only keep an order as draft or move it to submitted.
  if (row.status !== 'draft' && row.status !== 'submitted') {
    return { error: 'Invalid order status' }
  }

  // Validate company ownership (admins exempt — they may act on any company).
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  const isPiedroAdmin = isPiedroAdminRole(profile?.role)
  if (!isPiedroAdmin) {
    // A user may order for a company they belong to (user_companies) OR, as a
    // branch admin, for any client linked to a branch office they administer.
    const [ownIds, branchIds] = await Promise.all([
      getUserCompanyIds(user.id),
      getBranchAdminCompanyIds(user.id),
    ])
    const allowed = new Set([...ownIds, ...branchIds])
    if (!row.company_id || !allowed.has(row.company_id)) {
      return { error: 'You do not have access to this company' }
    }
  }

  const service = createServiceClient()

  // A draft is PRIVATE to the user who created it — only its owner may update or
  // submit it (drafts may be tests/notes/personal scratch). Sharing a draft with
  // other users is a deliberate future "on behalf" feature, authorized by the
  // creator — see memory project_draft_on_behalf_future.
  const { data: existing, error: fetchErr } = await service
    .from('orders')
    .select('status, user_id, order_seq')
    .eq('id', draftId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !existing) return { error: 'Order not found or access denied' }

  // Security: users may only edit their drafts, or an order staff explicitly
  // reopened for changes (reopenOrderAction). Anything else is locked.
  const isReopened = existing.status === 'changes_requested'
  if (existing.status !== 'draft' && !isReopened) {
    return { error: 'Cannot modify orders after submission' }
  }

  // A reopened order saved without submitting keeps waiting for the corrected
  // re-submit — "save draft" must never demote it to a private/deletable draft.
  const effectiveStatus = isReopened && row.status !== 'submitted' ? 'changes_requested' : row.status
  const submitting = effectiveStatus === 'submitted'

  const expected_dispatch_date = await computeDispatchDate(service, effectiveStatus, row.additions)

  // Re-submitting a reopened order = REPLACEMENT (ERP-clean void + re-import):
  // a NEW order (new number) carries the corrections and the original is
  // soft-cancelled, cross-linked both ways. The VSI console voids the old one
  // (it polls exported orders whose status turned cancelled) and imports the
  // replacement through the normal pending flow.
  if (isReopened && submitting) {
    const order_seq = await nextOrderSeq(service)
    const { data: created, error: insErr } = await service
      .from('orders')
      .insert({ ...row, user_id: user.id, status: 'submitted', expected_dispatch_date, order_seq, replaces_order_id: draftId })
      .select('id')
      .single()
    if (insErr || !created?.id) {
      // Original untouched (still changes_requested) — the client can retry.
      return { error: insErr ? `${insErr.message} [${insErr.code}]` : 'The order could not be saved.' }
    }
    const { error: cancelErr } = await service
      .from('orders')
      .update({ status: 'cancelled', replaced_by_order_id: created.id })
      .eq('id', draftId)
      .eq('user_id', user.id)
    // The replacement exists either way; a failed cancel only leaves the old one
    // reopened — surface nothing to the client, log for the trail.
    if (cancelErr) console.error('replacement created but original not cancelled', draftId, cancelErr.message)
    await logOnBehalf('order_replace_on_behalf', created.id, { replaces_order_id: draftId, company_id: row.company_id })

    if (pdfMeta) {
      const pdfResult = await generatePdf(created.id, { ...row, status: 'submitted' }, pdfMeta, service, user.id, user.email, order_seq)
      return { id: created.id, ...pdfResult }
    }
    return { id: created.id }
  }

  // Confirm the update actually hit the row (an UPDATE matching 0 rows returns no
  // error). Only a returned id proves the order is persisted — PDF/email come
  // strictly after this.
  // Draft → submit: assign the sequential number now (the draft had none).
  const assignedSeq = submitting && existing.order_seq == null ? await nextOrderSeq(service) : null
  const numberPatch = assignedSeq != null ? { order_seq: assignedSeq } : {}
  // The order date is the SUBMISSION date: a draft may sit for days before the
  // client submits it, and created_at is what lists, filters and the ERP pull
  // treat as the order date — move it to now when the draft becomes an order.
  const datePatch = submitting ? { created_at: new Date().toISOString() } : {}
  const { data: updated, error } = await service
    .from('orders')
    .update({ ...row, user_id: user.id, status: effectiveStatus, expected_dispatch_date, ...numberPatch, ...datePatch })
    .eq('id', draftId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()
  if (error || !updated?.id) {
    return { error: error ? `${error.message} [${error.code}]` : 'The order could not be saved.' }
  }
  await logOnBehalf(`order_${submitting ? 'submit' : 'draft'}_on_behalf`, draftId, { company_id: row.company_id })

  if (submitting && pdfMeta) {
    const seq = existing.order_seq ?? assignedSeq
    const pdfResult = await generatePdf(draftId, { ...row, status: effectiveStatus }, pdfMeta, service, user.id, user.email, seq)
    return { id: draftId, ...pdfResult }
  }
  return { id: draftId }
}

// ── Duplicate an order as draft ───────────────────────────────────────────────
export async function duplicateOrderAction(
  orderId: string,
): Promise<{ id?: string; productId?: string; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = createServiceClient()

  // Security: User can only duplicate their own orders
  const { data: src, error: fetchErr } = await service
    .from('orders')
    .select('company_id,product_id,unit,clinician,patient_name,reference_customer,quantity,construction_left,construction_right,width_left,width_right,size_left,size_right,additions,comments,diff_sizes_pairs')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single()
  if (fetchErr || !src) return { error: 'Order not found or access denied' }

  const { data: copy, error: insertErr } = await service
    .from('orders')
    .insert({ ...src, user_id: user.id, status: 'draft', pdf_url: null })
    .select('id, product_id')
    .single()
  if (insertErr || !copy) return { error: insertErr?.message ?? 'Duplicate failed' }
  await logOnBehalf('order_duplicate_on_behalf', copy.id)

  return { id: copy.id, productId: copy.product_id }
}

// True once Piedro has touched the order — at that point the client can no longer
// delete it (it must be cancelled by Piedro instead). "Untouched" = still a draft,
// or submitted but untriaged (approval_state registered/null) and not in production.
function piedroHasIntervened(o: {
  status: string
  approval_state: string | null
  production_state: string | null
}): boolean {
  if (o.production_state) return true
  if (o.status === 'draft') return false
  if (o.status === 'submitted') return !(o.approval_state == null || o.approval_state === 'registered')
  return true // approved / in_production / shipped / delivered / cancelled
}

// ── Delete an order (client, hard delete) ─────────────────────────────────────
// A client may permanently delete their OWN order as long as Piedro has not yet
// intervened. Once Piedro has acted on it, deletion is refused — the order must be
// cancelled by Piedro (cancelOrderAction), or Piedro removes the Order Piedro to
// release it back to the client.
export async function deleteOrderAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = createServiceClient()
  const { data: order, error: fetchErr } = await service
    .from('orders')
    .select('id, user_id, status, approval_state, production_state, order_seq, patient_name, reference_customer, pdf_url')
    .eq('id', orderId)
    .single()
  if (fetchErr) return { error: fetchErr.message }
  if (!order) return { error: 'Order not found' }
  if (order.user_id !== user.id) return { error: 'Not allowed' }
  if (piedroHasIntervened(order)) return { error: 'Order can no longer be deleted' }

  // ── Log the deletion FIRST, and fail closed ─────────────────────────────────
  // No deletion may be invisible: every delete leaves a trace of WHAT/WHO/WHEN in
  // admin_actions (the same audit trail we use for sensitive ops). We write it
  // before touching the row and refuse the delete if the log write fails. Only
  // IDENTIFIERS are kept — never the order content (RGPD: a client who deletes a
  // pre-intervention order does not leave their patient data behind).
  const imp = await getImpersonation()
  const { error: logErr } = await service.from('admin_actions').insert({
    actor_id:        imp?.adminId ?? user.id,
    actor_role:      imp ? 'piedro_admin' : 'client',
    action:          'order_delete',
    order_id:        orderId,   // FK is ON DELETE SET NULL; identifiers also live in details
    impersonated_as: imp?.targetId ?? null,
    details: {
      deleted_order_id:   orderId,
      order_seq:          order.order_seq ?? null,
      status:             order.status,
      patient_name:       order.patient_name ?? null,
      reference_customer: order.reference_customer ?? null,
      ...(imp ? { target_name: imp.targetName } : {}),
    },
  })
  if (logErr) {
    console.error('deleteOrderAction: audit write failed, refusing delete', orderId, logErr.message)
    return { error: 'Order could not be deleted (audit failed)' }
  }

  const { error } = await service.from('orders').delete().eq('id', orderId)
  if (error) return { error: error.message }

  // RGPD: remove the order's content (its PDF) too — deleted content is not retained.
  // Best-effort: the audit trace is already written, so a lingering PDF is a storage
  // leftover, not a lost record.
  if (order.pdf_url) {
    const { error: rmErr } = await service.storage.from('order-pdfs').remove([order.pdf_url])
    if (rmErr) console.error('deleteOrderAction: PDF removal failed (order deleted, PDF lingers)', orderId, rmErr.message)
  }
  return { ok: true }
}

// ── Cancel a reopened order (client, soft) ────────────────────────────────────
// While an order sits in 'changes_requested' its creator may cancel it instead
// of correcting it — the one exception to "clients can't cancel after Piedro
// intervened". Soft only (record kept, MDR); the VSI console voids the ERP copy
// when it polls exported orders whose status turned cancelled.
export async function cancelReopenedOrderAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = createServiceClient()
  const { data: order, error: fetchErr } = await service
    .from('orders')
    .select('user_id, status, order_seq, reference_customer, locale, reopen_reason')
    .eq('id', orderId)
    .single()
  if (fetchErr) return { error: fetchErr.message }
  if (!order) return { error: 'Order not found' }
  if (order.user_id !== user.id) return { error: 'Not allowed' }
  if (order.status !== 'changes_requested') return { error: 'Order is not open for changes' }

  const { error } = await service.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
  if (error) return { error: error.message }
  await logOnBehalf('order_cancel_reopened_on_behalf', orderId)

  // Tell the order desk the change request ended in a cancellation (best-effort).
  const { sendReopenDeskNote, orderRefLabel } = await import('@/lib/reopen-emails')
  await sendReopenDeskNote(
    'reopen_desk_client_cancelled_subject', 'reopen_desk_client_cancelled_body',
    { ref: orderRefLabel({ ...order, id: orderId }) }, order.reopen_reason ?? '—',
  )
  return { ok: true }
}

// ── Cancel an order (Piedro admin, soft) ──────────────────────────────────────
// Piedro admins may cancel any order that has not yet entered production. This is a
// soft action (status='cancelled') so the record — and its patient data trail — is
// preserved for MDR / ISO 13485 traceability.
export async function cancelOrderAction(
  orderId: string,
  reason?: string,
): Promise<{ ok?: boolean; error?: string }> {
  const scope = await getAdminScope()
  if (!scope) return { error: 'Not authenticated' }
  if (!isPiedroAdminRole(scope.role)) return { error: 'Not allowed' }

  const service = createServiceClient()
  const { data: order, error: fetchErr } = await service
    .from('orders')
    .select('status, production_state')
    .eq('id', orderId)
    .single()
  if (fetchErr) return { error: fetchErr.message }
  if (!order) return { error: 'Order not found' }
  if (order.production_state || ['in_production', 'shipped', 'delivered'].includes(order.status))
    return { error: 'Order already in production' }

  const { error } = await service.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
  if (error) return { error: error.message }

  // Audit trail — soft-cancel is a Piedro intervention; record who/when/why.
  await logAdminAction({
    actorId:   scope.userId,
    actorRole: scope.role,
    action:    'order_cancel',
    orderId,
    details:   { previous_status: order.status, reason: reason?.trim() || null },
  })
  return { ok: true }
}
