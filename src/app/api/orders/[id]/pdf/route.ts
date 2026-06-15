import { type NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { OrderPdf, type OrderPdfProps } from '@/components/order/OrderPdf'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminCompanyIds } from '@/lib/user-companies'
import { isPiedroAdmin } from '@/lib/roles'
import { displayWidthByConstruction } from '@/lib/width-display'
import { productImageUrl } from '@/lib/products/image-url'
import { rateLimit } from '@/lib/rate-limit'
import type { Locale } from '@/types'

// On-demand PDF for orders that have no stored PDF — i.e. orders migrated from
// the old Dataverse/Power Pages portal, which never went through the portal's
// submit flow. Generated fresh from the stored data and NOT persisted; it is
// watermarked to make clear it is a reproduction, not the document the customer
// originally received.
const WATERMARK = 'NOT THE ORIGINAL\n(MIGRATED ORDER)'

const SELECT = `id, status, unit, quantity, reference_customer, patient_name, clinician,
  construction_left, construction_right, width_left, width_right, size_left, size_right,
  diff_sizes_pairs, additions, comments, created_at, pdf_url, user_id, company_id, locale,
  products(colour_id, color_name, closure, picture_name),
  companies(name)`

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!rateLimit(`pdf:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests, please wait a moment.' }, { status: 429 })
    }

    const service = createServiceClient()
    const { data: order, error } = await service.from('orders').select(SELECT).eq('id', id).single()
    if (error || !order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // ── Visibility: same scope as the order detail pages ──────────────────────
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
    let allowed = isPiedroAdmin(profile?.role) || order.user_id === user.id
    if (!allowed) {
      const adminCompanyIds = await getAdminCompanyIds(user.id)
      allowed = !!order.company_id && adminCompanyIds.includes(order.company_id)
    }
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const product: any = Array.isArray(order.products) ? order.products[0] : order.products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const company: any = Array.isArray(order.companies) ? order.companies[0] : order.companies
    const locale: Locale = ((order as { locale?: string }).locale ?? 'en') as Locale

    // Translate categorical values (closure + constructions) into the order locale.
    const trKeys = [product?.closure, order.construction_left, order.construction_right]
      .filter((v): v is string => !!v)
    const trMap: Record<string, string> = {}
    if (trKeys.length) {
      const { data: trs } = await service.from('translations').select('key, en, nl, fr, de').in('key', trKeys)
      for (const r of trs ?? []) {
        const v = (r as Record<string, string | null>)[locale] || r.en || r.key
        if (v) trMap[r.key] = v
      }
    }
    const tr = (v: string | null) => (v && trMap[v]) || v

    const pdfProps: OrderPdfProps = {
      reference: order.reference_customer, status: order.status, unit: order.unit,
      clinician: order.clinician, patient_name: order.patient_name, quantity: order.quantity,
      construction_left: tr(order.construction_left), construction_right: tr(order.construction_right),
      width_left: order.width_left ? displayWidthByConstruction(order.width_left, order.construction_left, locale) : order.width_left,
      width_right: order.width_right ? displayWidthByConstruction(order.width_right, order.construction_right, locale) : order.width_right,
      size_left: order.size_left, size_right: order.size_right,
      additions: order.additions, comments: order.comments,
      created_at: order.created_at ?? new Date().toISOString(),
      companyName: company?.name ?? '—',
      productColourId: product?.colour_id ?? '',
      productColorName: product?.color_name ?? '',
      productClosure: tr(product?.closure ?? null) ?? '',
      productImageUrl: product?.picture_name ? productImageUrl(product.picture_name) : undefined,
      diff_sizes_pairs: order.diff_sizes_pairs,
      locale,
      showWatermark: true,
      watermarkText: WATERMARK,
    }

    const element = React.createElement(OrderPdf, pdfProps) as unknown as Parameters<typeof renderToBuffer>[0]
    const pdfBuffer = await renderToBuffer(element)
    const ref = order.reference_customer ?? id.slice(0, 8)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="migrated-${ref}.pdf"`,
      },
    })
  } catch (e) {
    console.error('Migrated-order PDF error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
