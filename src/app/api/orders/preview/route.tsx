import { type NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { OrderPdf, type OrderPdfProps } from '@/components/order/OrderPdf'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import type { Locale } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Preview renders patient data — require an authenticated session.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // PDF rendering is CPU-heavy — cap previews per user (best-effort).
    if (!rateLimit(`pdf:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests, please wait a moment.' }, { status: 429 })
    }

    const body = await request.json() as Omit<OrderPdfProps, 'showWatermark'>

    // Validate required fields
    if (!body.locale || !body.companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create PDF with watermark
    const pdfProps: OrderPdfProps = {
      ...body,
      locale: body.locale as Locale,
      showWatermark: true,
    }

    const element = React.createElement(OrderPdf, pdfProps) as unknown as Parameters<typeof renderToBuffer>[0]
    const pdfBuffer = await renderToBuffer(element)

    // Return PDF as download
    const ref = body.reference ?? 'preview'
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="preview-${ref}.pdf"`,
      },
    })
  } catch (e) {
    console.error('PDF preview error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
