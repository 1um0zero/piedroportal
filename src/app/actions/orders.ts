'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserCompanyIds } from '@/lib/user-companies'
import { escapeHtml } from '@/lib/escape-html'
import { renderToBuffer } from '@react-pdf/renderer'
import { Resend } from 'resend'
import React from 'react'

// Lazily create the Resend client so a missing key never crashes module load.
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}
const TO_EMAIL = process.env.ORDER_NOTIFY_EMAIL ?? 'tavares@umzero.pt'
// Production must use a Piedro-owned, Resend-verified domain (set EMAIL_FROM).
// The resend.dev sender is a sandbox address and is not deliverable in production.
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Piedro Portal <onboarding@resend.dev>'
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
  const isPiedroAdmin = profile?.role === 'piedro_admin'
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

  if (error) return { error: `${error.message} [${error.code}]` }
  const orderId: string = data.id

  if (row.status === 'submitted' && pdfMeta) {
    const pdfResult = await generatePdf(orderId, row, pdfMeta, service)
    return { id: orderId, ...pdfResult }
  }
  return { id: orderId }
}

// ── Shared PDF generation helper ──────────────────────────────────────────────
async function generatePdf(orderId: string, row: OrderRow, pdfMeta: PdfMeta, service: ReturnType<typeof createServiceClient>): Promise<{ pdf_url?: string; pdfError?: string; emailError?: string }> {
  try {
    const pdfProps: OrderPdfProps = {
      reference: row.reference_customer, status: row.status, unit: row.unit,
      clinician: row.clinician, patient_name: row.patient_name, quantity: row.quantity,
      construction_left: row.construction_left, construction_right: row.construction_right,
      width_left: row.width_left, width_right: row.width_right,
      size_left: row.size_left, size_right: row.size_right,
      additions: row.additions, comments: row.comments,
      created_at: new Date().toISOString(),
      companyName: pdfMeta.companyName, productColourId: pdfMeta.productColourId,
      productColorName: pdfMeta.productColorName, productClosure: pdfMeta.productClosure,
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
    const { data: { publicUrl } } = service.storage.from('order-pdfs').getPublicUrl(`${orderId}.pdf`)
    await service.from('orders').update({ pdf_url: publicUrl }).eq('id', orderId)

    // Send email with PDF attached. All patient/clinic-supplied values are
    // HTML-escaped to prevent injection into the email body.
    const ref = row.reference_customer ?? orderId.slice(0, 8)
    const resend = getResend()
    if (!resend) return { pdf_url: publicUrl, emailError: 'Email service not configured (RESEND_API_KEY missing)' }
    const { error: emailErr } = await resend.emails.send({
      from:    EMAIL_FROM,
      to:      [TO_EMAIL],
      subject: `Nova Encomenda Piedro — ${escapeHtml(ref)}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A96E;margin:0 0 24px">Piedro Portal</p>
        <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 20px">Nova encomenda submetida</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#44403C">
          <tr><td style="padding:8px 0;color:#78716C;width:120px">Referência</td><td style="padding:8px 0;font-weight:500">${escapeHtml(ref)}</td></tr>
          <tr><td style="padding:8px 0;color:#78716C">Empresa</td><td style="padding:8px 0;font-weight:500">${escapeHtml(pdfMeta.companyName)}</td></tr>
          <tr><td style="padding:8px 0;color:#78716C">Paciente</td><td style="padding:8px 0">${escapeHtml(row.patient_name ?? '—')}</td></tr>
          <tr><td style="padding:8px 0;color:#78716C">Modelo</td><td style="padding:8px 0">${escapeHtml(pdfMeta.productColourId)}</td></tr>
        </table>
        <p style="font-size:12px;color:#A8A29E;margin-top:24px">PDF em anexo.</p>
      </div>`,
      attachments: [{ filename: `encomenda-${ref}.pdf`, content: pdfBytes.toString('base64') }],
    })

    if (emailErr) {
      console.error('Email error:', emailErr)
      return { pdf_url: publicUrl, emailError: emailErr.message }
    }

    return { pdf_url: publicUrl }
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
  const isPiedroAdmin = profile?.role === 'piedro_admin'
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

  const { error } = await service
    .from('orders')
    .update({ ...row, user_id: user.id, status: row.status })
    .eq('id', draftId)
    .eq('user_id', user.id)
  if (error) return { error: `${error.message} [${error.code}]` }

  if (row.status === 'submitted' && pdfMeta) {
    const pdfResult = await generatePdf(draftId, row, pdfMeta, service)
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
