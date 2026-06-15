'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { isPiedroAdmin as isPiedroAdminRole } from '@/lib/roles'
import type { OrderStatus } from '@/types'
import { getUserCompanyIds, getUserExclusiveLabels } from '@/lib/user-companies'
import { isExclusiveVisible } from '@/lib/exclusive'
import { getSettings } from '@/lib/settings'
import { addWorkingDays } from '@/lib/dispatch'
import { getBranchNotifyTargets } from '@/lib/admin/branch-recipients'
import { signOrderPdf } from '@/lib/order-pdf'
import { escapeHtml } from '@/lib/escape-html'
import { getTranslations } from 'next-intl/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { Resend } from 'resend'
import React from 'react'
import { StockOrderPdf, type StockOrderPdfProps } from '@/components/order/StockOrderPdf'
import type { Locale, Product, StockProduct, StockSize } from '@/types'
import { PRODUCT_IMG_VERSION } from '@/lib/products/image-url'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const productImageUrl = (name: string | null | undefined) =>
  name && SUPABASE_URL
    ? `${SUPABASE_URL}/storage/v1/object/public/products/${name}?v=${PRODUCT_IMG_VERSION}`
    : undefined

// Same product fields the gallery/catalogue use, + exclusive for visibility.
const FIELDS = [
  'id', 'style_name', 'colour_id', 'picture_name', 'section',
  'closure', 'type', 'color_basic', 'color_name', 'color_name_i18n',
  'size_first', 'size_last', 'size_unit', 'diabetics', 'new_until', 'constructions',
  'exclusive', 'is_stock',
].join(',')

// A stock_order_items row stops reserving once its order reaches a terminal
// state. At that point the physical qty_on_hand has been (or is being)
// decremented externally (manual/XLS/ERP), so counting it again would
// double-subtract. Everything else (submitted/approved/in_production) reserves.
const TERMINAL_STATUSES = ['shipped', 'delivered', 'cancelled']

/**
 * STOCK products visible to the signed-in user, each with per-size availability.
 *
 *   available = product_stock.qty_on_hand − reserved
 *   reserved  = Σ stock_order_items.qty of NON-TERMINAL stock_orders
 *
 * Only sizes with available > 0 are returned, and only products that still have
 * at least one available size. Anonymous users browse like the public gallery:
 * they see non-exclusive stock only (ordering still gates on login).
 */
export async function getStockProducts(): Promise<StockProduct[]> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  let isAdmin = false
  let labelSet = new Set<string>()
  if (user) {
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
    isAdmin = isPiedroAdminRole(profile?.role)
    labelSet = new Set(await getUserExclusiveLabels(user.id))
  }

  const service = createServiceClient()

  // 1. Active STOCK products, filtered by exclusivity visibility.
  const { data: prodRows } = await service
    .from('products')
    .select(FIELDS)
    .eq('active', true)
    .eq('is_stock', true)
    .order('style_name')

  const products = ((prodRows ?? []) as unknown as (Product & { exclusive: string | null })[])
    .filter((p) => isExclusiveVisible(p.exclusive, labelSet, isAdmin))
  if (products.length === 0) return []

  const ids = products.map((p) => p.id)

  // 2. Physical stock per (product, size).
  const { data: stockRows } = await service
    .from('product_stock')
    .select('product_id, size, qty_on_hand')
    .in('product_id', ids)

  // 3. Reserved per (product, size): Σ qty of items in non-terminal orders.
  const { data: itemRows } = await service
    .from('stock_order_items')
    .select('product_id, size, qty, stock_orders!inner(status)')
    .in('product_id', ids)

  const reserved = new Map<string, number>()
  for (const r of (itemRows ?? []) as Array<{ product_id: string; size: number; qty: number; stock_orders: { status: string } | { status: string }[] }>) {
    const so = Array.isArray(r.stock_orders) ? r.stock_orders[0] : r.stock_orders
    if (!so || TERMINAL_STATUSES.includes(so.status)) continue
    const key = `${r.product_id}:${r.size}`
    reserved.set(key, (reserved.get(key) ?? 0) + r.qty)
  }

  // 4. Build available size lists; drop empty sizes and empty products.
  const sizesByProduct = new Map<string, StockSize[]>()
  for (const s of (stockRows ?? []) as Array<{ product_id: string; size: number; qty_on_hand: number }>) {
    const available = s.qty_on_hand - (reserved.get(`${s.product_id}:${s.size}`) ?? 0)
    if (available <= 0) continue
    const arr = sizesByProduct.get(s.product_id) ?? []
    arr.push({ size: Number(s.size), available })
    sizesByProduct.set(s.product_id, arr)
  }

  return products
    .map((p) => {
      const sizes = (sizesByProduct.get(p.id) ?? []).sort((a, b) => a.size - b.size)
      return { ...p, sizes } as StockProduct
    })
    .filter((p) => p.sizes.length > 0)
}

// ── Submit ──────────────────────────────────────────────────────────────────

export type StockOrderInput = {
  company_id: string | null
  locale: string
  clinician: string | null
  patient_name: string | null
  reference_customer: string | null
  comments: string | null
  items: Array<{ product_id: string; size: number; qty: number }>
}

async function computeStockDispatchDate(
  service: ReturnType<typeof createServiceClient>,
): Promise<string | null> {
  const s = await getSettings(['dispatch_days_normal'])
  const days = parseInt(s.dispatch_days_normal || '0', 10) || 0
  if (!days) return null
  const { data: cl } = await service.from('factory_closures').select('date')
  const closures = new Set((cl ?? []).map((r) => (r as { date: string }).date))
  return addWorkingDays(new Date().toISOString(), days, closures)
}

/**
 * Create a STOCK order (header + items). Stock orders have no draft — they
 * reserve on submit. Availability is re-checked server-side against live stock
 * so a stale grid can never oversell.
 */
export async function submitStockOrderAction(
  input: StockOrderInput,
): Promise<{ id?: string; error?: string; pdfError?: string; emailError?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const items = (input.items ?? []).filter((i) => i.qty > 0)
  if (items.length === 0) return { error: 'Empty order' }

  // Reference is required (same as a configured order).
  const reference = (input.reference_customer ?? '').trim()
  if (!reference) return { error: 'Reference is required' }

  // Company ownership: non-admins may only order for a company they belong to.
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = isPiedroAdminRole(profile?.role)
  if (!isAdmin) {
    const companyIds = await getUserCompanyIds(user.id)
    if (!input.company_id || !companyIds.includes(input.company_id)) {
      return { error: 'You do not have access to this company' }
    }
  }

  // Re-validate availability against live stock (defends against a stale grid).
  const available = new Map<string, number>()
  for (const p of await getStockProducts()) {
    for (const s of p.sizes) available.set(`${p.id}:${s.size}`, s.available)
  }
  for (const i of items) {
    const cap = available.get(`${i.product_id}:${i.size}`) ?? 0
    if (i.qty > cap) {
      return { error: `Requested quantity exceeds available stock for one of the items.` }
    }
  }

  const service = createServiceClient()
  const expected_dispatch_date = await computeStockDispatchDate(service)
  const { data: order, error } = await service
    .from('stock_orders')
    .insert({
      user_id:    user.id,
      company_id: input.company_id,
      status:     'submitted',
      locale:     input.locale,
      clinician:          input.clinician?.trim() || null,
      patient_name:       input.patient_name?.trim() || null,
      reference_customer: reference,
      comments:   input.comments,
      expected_dispatch_date,
    })
    .select('id')
    .single()

  if (error || !order?.id) {
    return { error: error ? `${error.message} [${error.code}]` : 'The order could not be saved.' }
  }
  const orderId: string = order.id

  const { error: itemsError } = await service.from('stock_order_items').insert(
    items.map((i) => ({ stock_order_id: orderId, product_id: i.product_id, size: i.size, qty: i.qty })),
  )
  if (itemsError) {
    // Roll back the header so we never leave an order with no lines.
    await service.from('stock_orders').delete().eq('id', orderId)
    return { error: `${itemsError.message} [${itemsError.code}]` }
  }

  // PDF + notification emails — failure here never invalidates the saved order
  // (it's already committed), it's just surfaced as a soft warning.
  const extra = await generateStockPdfAndEmail(orderId, service, user.id, user.email)
  return { id: orderId, ...extra }
}

// ── PDF + notification emails (mirrors the configured-order flow) ────────────

const splitEmails = (s?: string | null) =>
  (s ?? '').split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean)
const uniq = (arr: string[]) => [...new Set(arr.map((e) => e.toLowerCase()))]

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stockEmailHtml(t: any, heading: string, ref: string, company: string, patient: string, summary: string, intro?: string) {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
    <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A96E;margin:0 0 24px">Piedro Portal</p>
    <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 ${intro ? '12' : '20'}px">${escapeHtml(heading)}</h2>
    ${intro ? `<p style="font-size:14px;color:#44403C;margin:0 0 20px">${escapeHtml(intro)}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#44403C">
      <tr><td style="padding:8px 0;color:#78716C;width:120px">${escapeHtml(t('label_reference'))}</td><td style="padding:8px 0;font-weight:500">${escapeHtml(ref)}</td></tr>
      <tr><td style="padding:8px 0;color:#78716C">${escapeHtml(t('label_company'))}</td><td style="padding:8px 0;font-weight:500">${escapeHtml(company)}</td></tr>
      <tr><td style="padding:8px 0;color:#78716C">${escapeHtml(t('label_patient'))}</td><td style="padding:8px 0">${escapeHtml(patient)}</td></tr>
      <tr><td style="padding:8px 0;color:#78716C">${escapeHtml(t('label_model'))}</td><td style="padding:8px 0">${escapeHtml(summary)}</td></tr>
    </table>
    <p style="font-size:12px;color:#A8A29E;margin-top:24px">${escapeHtml(t('pdf_attached'))}</p>
  </div>`
}

async function generateStockPdfAndEmail(
  orderId: string,
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  userEmail?: string,
): Promise<{ pdfError?: string; emailError?: string }> {
  try {
    const { data } = await service
      .from('stock_orders')
      .select(`
        status, locale, reference_customer, clinician, patient_name, comments, created_at,
        companies(name),
        stock_order_items(size, qty, products(style_name, colour_id, color_name, picture_name))
      `)
      .eq('id', orderId)
      .single()
    if (!data) return { pdfError: 'Order not found after insert' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any
    const company = (Array.isArray(d.companies) ? d.companies[0] : d.companies)?.name ?? '—'
    const locale = (d.locale ?? 'en') as Locale
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (d.stock_order_items ?? []).map((i: any) => {
      const p = Array.isArray(i.products) ? i.products[0] : i.products
      return {
        size: Number(i.size), qty: i.qty,
        colourId: p ? `${p.style_name}.${p.colour_id}` : '—',
        colorName: p?.color_name ?? '',
        imageUrl: productImageUrl(p?.picture_name),
        styleName: p?.style_name as string | undefined,
      }
    }).sort((a: { size: number }, b: { size: number }) => a.size - b.size)

    const ref = d.reference_customer ?? orderId.slice(0, 8)
    const totalPairs = items.reduce((s: number, i: { qty: number }) => s + i.qty, 0)
    const summary = `${items.length} × ${totalPairs} pr`

    const pdfProps: StockOrderPdfProps = {
      reference: d.reference_customer, status: d.status, created_at: d.created_at,
      companyName: company, clinician: d.clinician, patientName: d.patient_name,
      comments: d.comments, locale,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: items.map((i: any) => ({ size: i.size, qty: i.qty, colourId: i.colourId, colorName: i.colorName, imageUrl: i.imageUrl })),
    }
    const element = React.createElement(StockOrderPdf, pdfProps) as unknown as Parameters<typeof renderToBuffer>[0]
    const pdfBytes = Buffer.from(await renderToBuffer(element))

    // Same private bucket + `${id}.pdf` path the configured orders use, so the
    // shared signOrderPdfs() works for both kinds in the lists.
    const { error: uploadErr } = await service.storage
      .from('order-pdfs')
      .upload(`${orderId}.pdf`, pdfBytes, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) return { pdfError: `Storage: ${uploadErr.message}` }
    await service.from('stock_orders').update({ pdf_url: `${orderId}.pdf` }).eq('id', orderId)

    // ── Emails ──
    const resend = getResend()
    if (!resend) return { emailError: 'Email service not configured (RESEND_API_KEY missing)' }
    const cfg = await getSettings(['order_notify_email', 'email_from', 'notify_locale'])
    // The order-desk setting may hold a comma-separated list of addresses.
    const toEmails = splitEmails(cfg.order_notify_email)
    const emailFrom = cfg.email_from
    if (!emailFrom || (!toEmails.length && !userEmail)) {
      return { emailError: 'Email not sent: set sender/recipient in Admin → Settings' }
    }

    const attachment = { filename: `stock-order-${ref}.pdf`, content: pdfBytes.toString('base64') }
    const patient = d.patient_name ?? '—'
    const internalLocale = (cfg.notify_locale ?? 'en') as Locale
    const errors: string[] = []

    // (1) Internal notification to the order desk.
    if (toEmails.length) {
      const t = await getTranslations({ locale: internalLocale, namespace: 'emails' })
      const { error } = await resend.emails.send({
        from: emailFrom, to: toEmails,
        subject: t('subject_internal', { ref }),
        html: stockEmailHtml(t, t('heading_internal'), ref, company, patient, summary),
        attachments: [attachment],
      })
      if (error) errors.push(`internal: ${error.message}`)
    }

    // (2) Confirmation to the ordering user (+ Cc/Bcc).
    if (userEmail) {
      const { data: prof } = await service.from('profiles').select('notify_cc, notify_bcc').eq('id', userId).single()
      const cc = uniq(splitEmails(prof?.notify_cc)).filter((e) => e !== userEmail.toLowerCase())
      const bcc = uniq(splitEmails(prof?.notify_bcc))
      const t = await getTranslations({ locale, namespace: 'emails' })
      const { error } = await resend.emails.send({
        from: emailFrom, to: [userEmail],
        cc: cc.length ? cc : undefined, bcc: bcc.length ? bcc : undefined,
        subject: t('subject_client', { ref }),
        html: stockEmailHtml(t, t('heading_client'), ref, company, patient, summary, t('client_intro')),
        attachments: [attachment],
      })
      if (error) errors.push(`client: ${error.message}`)
    }

    // (3) Branch copies — union of branches in scope for any model in the order.
    const styleNames = [...new Set(items.map((i: { styleName?: string }) => i.styleName).filter(Boolean))] as string[]
    const internalSet = new Set(toEmails.map((e) => e.toLowerCase()))
    const branchMap = new Map<string, Locale>()
    for (const sn of styleNames) {
      for (const bt of await getBranchNotifyTargets(sn)) {
        if (!internalSet.has(bt.email.toLowerCase())) branchMap.set(bt.email, bt.locale)
      }
    }
    for (const [email, bl] of branchMap) {
      const t = await getTranslations({ locale: bl, namespace: 'emails' })
      const { error } = await resend.emails.send({
        from: emailFrom, to: [email],
        subject: t('subject_internal', { ref }),
        html: stockEmailHtml(t, t('heading_internal'), ref, company, patient, summary),
        attachments: [attachment],
      })
      if (error) errors.push(`branch ${email}: ${error.message}`)
    }

    if (errors.length) {
      console.error('Stock email error:', errors.join(' | '))
      return { emailError: errors.join(' | ') }
    }
    return {}
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Stock PDF error:', msg)
    return { pdfError: msg }
  }
}

// ── Listing & detail (unified /orders + /admin/orders) ───────────────────────

// A stock order normalized to the same shape the orders list/table consumes, so
// both order kinds render in one list. `kind: 'stock'` lets the table branch on
// the few cells that differ (no patient/additions/unit; multi-product summary).
export type StockOrderListRow = {
  kind: 'stock'
  id: string
  user_id: string
  status: string
  approval_state: string | null
  production_state: string | null
  patient_name: string | null
  reference_customer: string | null
  created_at: string
  updated_at: string
  expected_dispatch_date: string | null
  comments: string | null
  pdf_url: string | null
  companies: { id: string; name: string; erp_code: string } | null
  // Synthetic summary for the product cell.
  products: { style_name: string; colour_id: string; closure: string; picture_name: string } | null
  stock_models: number
  stock_pairs: number
  // All distinct model style names in the order — for back-office branch scoping.
  styleNames: string[]
}

type ListOpts = {
  userId?: string
  companyIds?: string[]   // when set, fetch orders for these companies (company-admin)
  all?: boolean           // back-office: every stock order
  fromISO?: string
  toISO?: string
  cutoffISO?: string | null
}

const STOCK_LIST_SELECT = `
  id, user_id, status, approval_state, production_state, patient_name, reference_customer,
  created_at, updated_at, expected_dispatch_date, comments, pdf_url,
  companies(id, name, erp_code),
  stock_order_items(qty, products(style_name, colour_id, closure, picture_name))
`

/** Stock orders for the unified list, normalized to StockOrderListRow[]. */
export async function getStockOrderRows(opts: ListOpts): Promise<StockOrderListRow[]> {
  const service = createServiceClient()
  let q = service.from('stock_orders').select(STOCK_LIST_SELECT).order('created_at', { ascending: false })

  if (opts.all) { /* no owner filter */ }
  else if (opts.companyIds && opts.companyIds.length > 0) q = q.in('company_id', opts.companyIds)
  else if (opts.userId) q = q.eq('user_id', opts.userId)
  else return []

  if (opts.fromISO && opts.toISO) q = q.gte('created_at', opts.fromISO).lte('created_at', opts.toISO)
  else if (opts.cutoffISO) q = q.gte('created_at', opts.cutoffISO)

  const { data, error } = await q
  if (error || !data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((o) => {
    const items = (o.stock_order_items ?? []) as Array<{ qty: number; products: { style_name: string; colour_id: string; closure: string; picture_name: string } | null }>
    const pairs = items.reduce((s, i) => s + (i.qty ?? 0), 0)
    const first = items[0]?.products ?? null
    const styleNames = [...new Set(items.map((i) => i.products?.style_name).filter((v): v is string => !!v))]
    const company = Array.isArray(o.companies) ? o.companies[0] : o.companies
    return {
      kind: 'stock' as const,
      id: o.id,
      user_id: o.user_id,
      status: o.status,
      approval_state: o.approval_state ?? null,
      production_state: o.production_state ?? null,
      patient_name: o.patient_name ?? null,
      reference_customer: o.reference_customer ?? null,
      created_at: o.created_at,
      updated_at: o.updated_at,
      expected_dispatch_date: o.expected_dispatch_date ?? null,
      comments: o.comments ?? null,
      pdf_url: o.pdf_url ?? null,
      companies: company ?? null,
      products: first,
      stock_models: items.length,
      stock_pairs: pairs,
      styleNames,
    }
  })
}

export type StockOrderDetail = {
  id: string
  user_id: string
  status: string
  locale: string
  clinician: string | null
  patient_name: string | null
  reference_customer: string | null
  comments: string | null
  pdf_url: string | null
  expected_dispatch_date: string | null
  created_at: string
  company: { name: string; erp_code: string } | null
  items: Array<{ id: string; size: number; qty: number; product: { style_name: string; colour_id: string; color_name: string; closure: string; picture_name: string } | null }>
}

/** Full stock order for the detail page. Returns null if not found or (for a
 *  non-admin) not owned by the requester. */
export async function getStockOrderDetail(id: string): Promise<StockOrderDetail | null> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = isPiedroAdminRole(profile?.role)

  const service = createServiceClient()
  const { data } = await service
    .from('stock_orders')
    .select(`
      id, user_id, status, locale, clinician, patient_name, reference_customer, comments,
      pdf_url, expected_dispatch_date, created_at, company_id,
      companies(name, erp_code),
      stock_order_items(id, size, qty, products(style_name, colour_id, color_name, closure, picture_name))
    `)
    .eq('id', id)
    .single()
  if (!data) return null

  // Ownership: a non-admin may only see their own order (or one for a company
  // they administer — checked via company membership).
  if (!isAdmin && data.user_id !== user.id) {
    const ids = await getUserCompanyIds(user.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(data as any).company_id || !ids.includes((data as any).company_id)) return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any
  const company = Array.isArray(d.companies) ? d.companies[0] : d.companies
  return {
    id: d.id,
    user_id: d.user_id,
    status: d.status,
    locale: d.locale,
    clinician: d.clinician ?? null,
    patient_name: d.patient_name ?? null,
    reference_customer: d.reference_customer ?? null,
    comments: d.comments,
    // Private bucket → hand back a short-lived signed URL, not the stored path.
    pdf_url: d.pdf_url ? await signOrderPdf(d.id) : null,
    expected_dispatch_date: d.expected_dispatch_date,
    created_at: d.created_at,
    company: company ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (d.stock_order_items ?? []).map((i: any) => ({
      id: i.id,
      size: Number(i.size),
      qty: i.qty,
      product: Array.isArray(i.products) ? i.products[0] : i.products,
    })).sort((a: { size: number }, b: { size: number }) => a.size - b.size),
  }
}

const VALID_STATUSES: OrderStatus[] = ['submitted', 'approved', 'in_production', 'shipped', 'delivered', 'cancelled']

/** Admin-only: set a stock order's status. Terminal states (shipped/delivered/
 *  cancelled) stop the order reserving stock (see getStockProducts). */
export async function updateStockOrderStatusAction(id: string, status: string): Promise<{ error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdminRole(profile?.role)) return { error: 'Forbidden' }
  if (!VALID_STATUSES.includes(status as OrderStatus)) return { error: 'Invalid status' }

  const service = createServiceClient()
  const { error } = await service
    .from('stock_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/stock/${id}`)
  return {}
}
