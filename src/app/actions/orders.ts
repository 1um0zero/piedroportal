'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { renderToBuffer } from '@react-pdf/renderer'
import { Resend } from 'resend'
import React from 'react'
import { OrderPdf, type OrderPdfProps } from '@/components/order/OrderPdf'

const resend = new Resend(process.env.RESEND_API_KEY)
const TO_EMAIL = process.env.ORDER_NOTIFY_EMAIL ?? 'suporte@umzero.pt'

export type OrderRow = {
  user_id:            string
  company_id:         string | null
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
}

export type PdfMeta = {
  productColourId:  string
  productColorName: string
  productClosure:   string
  companyName:      string
}

export async function insertOrderAction(
  row:     OrderRow,
  pdfMeta?: PdfMeta,   // provided only when status === 'submitted'
): Promise<{ id?: string; pdf_url?: string; error?: string; pdfError?: string }> {

  // Verify session server-side
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Use service role for DB operations — avoids PGRST116 after INSERT + RLS SELECT mismatch
  const service = createServiceClient()
  const { data, error } = await service
    .from('orders')
    .insert({ ...row, user_id: user.id })
    .select('id')
    .single()

  if (error) return { error: `${error.message} [${error.code}]` }
  const orderId: string = data.id

  // For submitted orders: generate PDF → upload to Storage → send email
  if (row.status === 'submitted' && pdfMeta) {
    try {
      const pdfProps: OrderPdfProps = {
        reference:          row.reference_customer,
        status:             row.status,
        unit:               row.unit,
        clinician:          row.clinician,
        patient_name:       row.patient_name,
        quantity:           row.quantity,
        construction_left:  row.construction_left,
        construction_right: row.construction_right,
        width_left:         row.width_left,
        width_right:        row.width_right,
        size_left:          row.size_left,
        size_right:         row.size_right,
        additions:          row.additions,
        comments:           row.comments,
        created_at:         new Date().toISOString(),
        companyName:        pdfMeta.companyName,
        productColourId:    pdfMeta.productColourId,
        productColorName:   pdfMeta.productColorName,
        productClosure:     pdfMeta.productClosure,
      }

      const element = React.createElement(OrderPdf, pdfProps) as unknown as Parameters<typeof renderToBuffer>[0]
      const pdfBuffer = await renderToBuffer(element)
      const pdfBytes = Buffer.from(pdfBuffer)

      // Upload PDF to Supabase Storage (order-pdfs bucket must be public)
      const pdfPath = `${orderId}.pdf`
      const { error: uploadErr } = await service.storage
        .from('order-pdfs')
        .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true })

      let pdfUrl: string | undefined
      if (!uploadErr) {
        const { data: { publicUrl } } = service.storage.from('order-pdfs').getPublicUrl(pdfPath)
        pdfUrl = publicUrl
        await service.from('orders').update({ pdf_url: publicUrl }).eq('id', orderId)
      } else {
        console.error('Storage upload error:', uploadErr)
      }

      // Send email via Resend
      const ref = row.reference_customer ?? orderId.slice(0, 8)
      const { error: emailErr } = await resend.emails.send({
        from:    'Piedro Portal <onboarding@resend.dev>',
        to:      [TO_EMAIL],
        subject: `Nova Encomenda Piedro — ${ref}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A96E;margin:0 0 24px">Piedro Portal</p>
            <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 20px">Nova encomenda submetida</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#44403C">
              <tr><td style="padding:8px 0;color:#78716C;width:120px">Referência</td><td style="padding:8px 0;font-weight:500">${ref}</td></tr>
              <tr><td style="padding:8px 0;color:#78716C">Empresa</td><td style="padding:8px 0;font-weight:500">${pdfMeta.companyName}</td></tr>
              <tr><td style="padding:8px 0;color:#78716C">Paciente</td><td style="padding:8px 0">${row.patient_name ?? '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#78716C">Modelo</td><td style="padding:8px 0">${pdfMeta.productColourId}</td></tr>
            </table>
            <p style="font-size:12px;color:#A8A29E;margin-top:24px">O PDF da encomenda está em anexo.</p>
          </div>
        `,
        attachments: [{
          filename: `encomenda-${ref}.pdf`,
          content:  pdfBytes.toString('base64'),
        }],
      })
      if (emailErr) console.error('Email error:', emailErr)

      return { id: orderId, pdf_url: pdfUrl }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('PDF/email error:', msg)
      // Order already saved — return id + error detail so the form can show it
      return { id: orderId, pdfError: msg }
    }
  }

  return { id: orderId }
}
