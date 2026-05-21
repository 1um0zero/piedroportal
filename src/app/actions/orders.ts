'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { OrderPdf, type OrderPdfProps } from '@/components/order/OrderPdf'


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
  productImageUrl?: string
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

  // For submitted orders: generate PDF → upload to Storage (email disabled for now — diagnosing)
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
        productImageUrl:    pdfMeta.productImageUrl,
      }

      const element = React.createElement(OrderPdf, pdfProps) as unknown as Parameters<typeof renderToBuffer>[0]
      const pdfBuffer = await renderToBuffer(element)
      const pdfBytes = Buffer.from(pdfBuffer)

      const pdfPath = `${orderId}.pdf`
      const { error: uploadErr } = await service.storage
        .from('order-pdfs')
        .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true })

      if (uploadErr) {
        console.error('Storage upload error:', uploadErr)
        return { id: orderId, pdfError: `Storage: ${uploadErr.message}` }
      }

      const { data: { publicUrl } } = service.storage.from('order-pdfs').getPublicUrl(pdfPath)
      await service.from('orders').update({ pdf_url: publicUrl }).eq('id', orderId)

      return { id: orderId, pdf_url: publicUrl }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('PDF error:', msg)
      return { id: orderId, pdfError: msg }
    }
  }

  return { id: orderId }
}
