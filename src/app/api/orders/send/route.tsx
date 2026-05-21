import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import { Resend } from 'resend'
import React from 'react'
import { OrderPdf, type OrderPdfProps } from '@/components/order/OrderPdf'

const resend = new Resend(process.env.RESEND_API_KEY)
const TO_EMAIL = process.env.ORDER_NOTIFY_EMAIL ?? 'suporte@umzero.pt'

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json() as { orderId: string }
    if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

    // Service role client — bypasses RLS to fetch any order
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: order, error } = await sb
      .from('orders')
      .select(`
        id, status, unit, clinician, patient_name, reference_customer,
        quantity, construction_left, construction_right,
        width_left, width_right, size_left, size_right,
        additions, comments, created_at,
        products ( colour_id, color_name, closure ),
        companies ( name )
      `)
      .eq('id', orderId)
      .single()

    if (error || !order) {
      console.error('Order fetch error:', error)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Supabase returns arrays for joined tables; take first element
    const product = (Array.isArray(order.products) ? order.products[0] : order.products) as { colour_id: string; color_name: string; closure: string } | null
    const company = (Array.isArray(order.companies) ? order.companies[0] : order.companies) as { name: string } | null

    const pdfProps: OrderPdfProps = {
      reference:          order.reference_customer,
      status:             order.status,
      unit:               order.unit,
      clinician:          order.clinician,
      patient_name:       order.patient_name,
      quantity:           order.quantity ?? 1,
      construction_left:  order.construction_left,
      construction_right: order.construction_right,
      width_left:         order.width_left,
      width_right:        order.width_right,
      size_left:          order.size_left,
      size_right:         order.size_right,
      additions:          order.additions as Record<string, unknown> | null,
      comments:           order.comments,
      created_at:         order.created_at,
      companyName:        company?.name ?? '—',
      productColourId:    product?.colour_id ?? '—',
      productColorName:   product?.color_name ?? '—',
      productClosure:     product?.closure ?? '—',
    }

    // renderToBuffer expects a ReactElement<DocumentProps>; cast via unknown to satisfy TS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(OrderPdf, pdfProps) as unknown as Parameters<typeof renderToBuffer>[0]
    const pdfBuffer = await renderToBuffer(element)

    const ref = order.reference_customer ?? orderId.slice(0, 8)
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
            <tr><td style="padding:8px 0;color:#78716C">Empresa</td><td style="padding:8px 0;font-weight:500">${company?.name ?? '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#78716C">Paciente</td><td style="padding:8px 0">${order.patient_name ?? '—'}</td></tr>
            <tr><td style="padding:8px 0;color:#78716C">Modelo</td><td style="padding:8px 0">${product?.colour_id ?? '—'}</td></tr>
          </table>
          <p style="font-size:12px;color:#A8A29E;margin-top:24px">O PDF da encomenda está em anexo.</p>
        </div>
      `,
      attachments: [{
        filename: `encomenda-${ref}.pdf`,
        content:  Buffer.from(pdfBuffer).toString('base64'),
      }],
    })

    if (emailErr) {
      console.error('Email error:', emailErr)
      return NextResponse.json({ error: emailErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Send order error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
