'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin as isPiedroAdminRole } from '@/lib/roles'
import { getUserCompanyIds } from '@/lib/user-companies'
import { getSettings } from '@/lib/settings'
import { getBranchNotifyTargets } from '@/lib/admin/branch-recipients'
import { escapeHtml } from '@/lib/escape-html'
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
    const companyIds = await getUserCompanyIds(user.id)
    if (!row.company_id || !companyIds.includes(row.company_id)) {
      return { error: 'You do not have access to this company' }
    }
  }

  // Use service role for DB operations — avoids PGRST116 after INSERT + RLS SELECT mismatch.
  // user_id and status are forced server-side and never trusted from the client.
  const service = createServiceClient()
  const { data, error } = await service
    .from('orders')
    .insert({ ...row, user_id: user.id, status: row.status })
    .select('id')
    .single()

  // Confirm an effective commit: only a row id coming back from the DB proves the
  // order is persisted. PDF/email (the system's proof of registration) are
  // generated ONLY after this confirmation, never before.
  if (error || !data?.id) {
    return { error: error ? `${error.message} [${error.code}]` : 'The order could not be saved.' }
  }
  const orderId: string = data.id

  if (row.status === 'submitted' && pdfMeta) {
    const pdfResult = await generatePdf(orderId, row, pdfMeta, service, user.id, user.email)
    return { id: orderId, ...pdfResult }
  }
  return { id: orderId }
}

// ── Email helpers ──────────────────────────────────────────────────────────────
type EmailT = Awaited<ReturnType<typeof getTranslations<'emails'>>>
const splitEmails = (s?: string | null) =>
  (s ?? '').split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
const uniq = (arr: string[]) => [...new Set(arr.map(e => e.toLowerCase()))]

function orderEmailHtml(t: EmailT, heading: string, ref: string, company: string, patient: string, model: string, intro?: string) {
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
    <p style="font-size:12px;color:#A8A29E;margin-top:24px">${escapeHtml(t('pdf_attached'))}</p>
  </div>`
}

// ── Shared PDF generation helper ──────────────────────────────────────────────
async function generatePdf(orderId: string, row: OrderRow, pdfMeta: PdfMeta, service: ReturnType<typeof createServiceClient>, userId: string, userEmail?: string): Promise<{ pdf_url?: string; pdfError?: string; emailError?: string }> {
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
      reference: row.reference_customer, status: row.status, unit: row.unit,
      clinician: row.clinician, patient_name: row.patient_name, quantity: row.quantity,
      construction_left: tr(row.construction_left), construction_right: tr(row.construction_right),
      width_left: row.width_left, width_right: row.width_right,
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
    const ref     = row.reference_customer ?? orderId.slice(0, 8)
    const patient = row.patient_name ?? '—'
    const resend = getResend()
    if (!resend) return { pdf_url: pdfPath, emailError: 'Email service not configured (RESEND_API_KEY missing)' }
    const cfg = await getSettings(['order_notify_email', 'email_from', 'notify_locale'])
    const toEmail   = cfg.order_notify_email ?? process.env.ORDER_NOTIFY_EMAIL
    const emailFrom = cfg.email_from         ?? process.env.EMAIL_FROM
    if (!emailFrom || (!toEmail && !userEmail)) {
      return { pdf_url: pdfPath, emailError: 'Email not sent: set sender/recipient in Admin → Settings' }
    }

    const attachment = { filename: `order-${ref}.pdf`, content: pdfBytes.toString('base64') }
    const internalLocale = (cfg.notify_locale ?? 'en') as 'en' | 'nl' | 'fr' | 'de'
    const orderLocale    = (row.locale ?? 'en') as 'en' | 'nl' | 'fr' | 'de'
    const errors: string[] = []

    // (1) Internal notification to the order desk.
    if (toEmail) {
      const t = await getTranslations({ locale: internalLocale, namespace: 'emails' })
      const { error } = await resend.emails.send({
        from: emailFrom, to: [toEmail],
        subject: t('subject_internal', { ref }),
        html: orderEmailHtml(t, t('heading_internal'), ref, pdfMeta.companyName, patient, pdfMeta.productColourId),
        attachments: [attachment],
      })
      if (error) errors.push(`internal: ${error.message}`)
    }

    // (2) Confirmation to the ordering user (+ user/company Cc/Bcc).
    if (userEmail) {
      const [{ data: prof }, { data: comp }] = await Promise.all([
        service.from('profiles').select('notify_cc, notify_bcc').eq('id', userId).single(),
        row.company_id
          ? service.from('companies').select('notify_cc, notify_bcc').eq('id', row.company_id).single()
          : Promise.resolve({ data: null as { notify_cc?: string; notify_bcc?: string } | null }),
      ])
      const cc  = uniq([...splitEmails(prof?.notify_cc),  ...splitEmails(comp?.notify_cc)]).filter(e => e !== userEmail.toLowerCase())
      const bcc = uniq([...splitEmails(prof?.notify_bcc), ...splitEmails(comp?.notify_bcc)])
      const t = await getTranslations({ locale: orderLocale, namespace: 'emails' })
      const { error } = await resend.emails.send({
        from: emailFrom, to: [userEmail],
        cc:  cc.length  ? cc  : undefined,
        bcc: bcc.length ? bcc : undefined,
        subject: t('subject_client', { ref }),
        html: orderEmailHtml(t, t('heading_client'), ref, pdfMeta.companyName, patient, pdfMeta.productColourId, t('client_intro')),
        attachments: [attachment],
      })
      if (error) errors.push(`client: ${error.message}`)
    }

    // (3) Branch-office copies — each relevant branch in its OWN language.
    const { data: prod } = await service.from('products').select('style_name').eq('id', row.product_id).single()
    const branchTargets = (await getBranchNotifyTargets(prod?.style_name))
      .filter(bt => bt.email.toLowerCase() !== (toEmail ?? '').toLowerCase())
    for (const bt of branchTargets) {
      const t = await getTranslations({ locale: bt.locale, namespace: 'emails' })
      const { error } = await resend.emails.send({
        from: emailFrom, to: [bt.email],
        subject: t('subject_internal', { ref }),
        html: orderEmailHtml(t, t('heading_internal'), ref, pdfMeta.companyName, patient, pdfMeta.productColourId),
        attachments: [attachment],
      })
      if (error) errors.push(`branch ${bt.email}: ${error.message}`)
    }

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
    const companyIds = await getUserCompanyIds(user.id)
    if (!row.company_id || !companyIds.includes(row.company_id)) {
      return { error: 'You do not have access to this company' }
    }
  }

  const service = createServiceClient()

  // Verify order exists and belongs to user
  const { data: existing, error: fetchErr } = await service
    .from('orders')
    .select('status, user_id')
    .eq('id', draftId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !existing) return { error: 'Order not found or access denied' }

  // Security: Only draft orders can be updated by users
  if (existing.status !== 'draft') {
    return { error: 'Cannot modify orders after submission' }
  }

  // Confirm the update actually hit the row (an UPDATE matching 0 rows returns no
  // error). Only a returned id proves the order is persisted — PDF/email come
  // strictly after this.
  const { data: updated, error } = await service
    .from('orders')
    .update({ ...row, user_id: user.id, status: row.status })
    .eq('id', draftId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle()
  if (error || !updated?.id) {
    return { error: error ? `${error.message} [${error.code}]` : 'The order could not be saved.' }
  }

  if (row.status === 'submitted' && pdfMeta) {
    const pdfResult = await generatePdf(draftId, row, pdfMeta, service, user.id, user.email)
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

  return { id: copy.id, productId: copy.product_id }
}

// ── Delete a draft order ──────────────────────────────────────────────────────
export async function deleteOrderAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = createServiceClient()
  const { error } = await service
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('user_id', user.id)
    .eq('status', 'draft')
  if (error) return { error: error.message }
  return { ok: true }
}
