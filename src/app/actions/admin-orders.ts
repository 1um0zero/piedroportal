'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'
import { logAdminAction } from '@/lib/admin/audit'
import { getImpersonation } from '@/lib/impersonation'
import { getSettings } from '@/lib/settings'
import { escapeHtml } from '@/lib/escape-html'
import { orderNumber } from '@/lib/format'
import { getTranslations } from 'next-intl/server'
import { Resend } from 'resend'
import type { ApprovalState, ProductionState } from '@/lib/order-status'

// NOTE: this is a 'use server' module — it may ONLY export async functions.
// Do NOT re-export types/consts here (Turbopack emits a runtime ref → ReferenceError
// at module load, which 500s every action in the file). Import types from
// '@/lib/order-status' directly where needed.

// ── Server actions ─────────────────────────────────────────────────────────────

export async function updateOrderAdminAction(
  orderId: string,
  fields: {
    approval_state?:  ApprovalState
    production_state?: ProductionState
    piedro_order_id?: string
    piedro_notes?:    string
  },
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const scope = await getAdminScope()
    if (!scope) return { error: 'Not authenticated' }
    if (scope.role === 'branch_staff' && !scope.branchId) return { error: 'Not authorized' }
    // These are approval/Piedro-Order management fields: a plain back-office user
    // (e.g. a branch_staff WITHOUT the orders_approval capability) may consult the
    // order but never write here. piedro_admin/super_admin always carry it.
    if (!scope.canApproveOrders) return { error: 'Not authorized' }

    const service = createServiceClient()

    // Branch staff can only act on orders whose product model AND company are within their scope.
    if (!scope.allModels) {
      const { data: ord } = await service
        .from('orders').select('company_id, products(style_name)').eq('id', orderId).single()
      const style = (ord as { products?: { style_name?: string } } | null)?.products?.style_name
      if (!scope.canModel(style)) return { error: 'Not authorized' }
      if (!scope.canCompany((ord as { company_id?: string | null } | null)?.company_id)) return { error: 'Not authorized' }
    }

    // Validation: cannot approve without Piedro Order ID; and stamp the
    // approval date the first time an order is approved (the ERP/grid reads it).
    let stampApprovalDate = false
    if (fields.approval_state === 'approved') {
      const { data: order } = await service
        .from('orders')
        .select('piedro_order_id, approval_date')
        .eq('id', orderId)
        .single()
      const currentPiedroId = fields.piedro_order_id ?? order?.piedro_order_id
      if (!currentPiedroId?.trim()) {
        return { error: 'Piedro Order # is required before approving.' }
      }
      if (!order?.approval_date) stampApprovalDate = true
    }

    // Also update the portal status to keep them in sync
    const statusMap: Partial<Record<ApprovalState, string>> = {
      approved:         'approved',
      refused:          'cancelled',
      under_analysis:   'submitted',
      need_attention:   'submitted',
      awaiting_payment: 'submitted',
    }
    // Strip undefined so we never blank a column we didn't mean to touch.
    const update: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) update[k] = v
    if (fields.approval_state && statusMap[fields.approval_state]) {
      update.status = statusMap[fields.approval_state]
    }
    if (fields.production_state) {
      update.status = 'in_production'
    }
    if (stampApprovalDate) update.approval_date = new Date().toISOString()

    const { error } = await service.from('orders').update(update).eq('id', orderId)
    if (error) {
      console.error('updateOrderAdminAction update error', error)
      return { error: error.message || error.details || error.hint || error.code || 'Update failed' }
    }

    // Audit trail — record which back-office fields were changed and to what.
    // Under "View as" the session (and scope) belong to the TARGET user, so the
    // change would be attributed to them with no trace of the admin driving it —
    // attribute the action to the real admin and mark the impersonation.
    const imp = await getImpersonation()
    await logAdminAction({
      actorId:   imp?.adminId ?? scope.userId,
      actorRole: imp ? 'piedro_admin' : scope.role,
      action:    'order_update',
      orderId,
      details:   imp ? { changed: update, target_name: imp.targetName } : { changed: update },
      impersonatedAsUserId: imp?.targetId,
    })
    return { ok: true }
  } catch (e) {
    console.error('updateOrderAdminAction threw', e)
    return { error: e instanceof Error ? e.message : 'Unexpected error' }
  }
}

// ── Reopen an order for client edits ("changes requested") ────────────────────
// A staff member with the approval capability puts a submitted/approved order —
// not yet in production — into 'changes_requested'. The user who CREATED the
// order can then edit it in the order form and re-submit it under the SAME order
// number (updateOrderAction in orders.ts allows owner edits in this state and
// never re-mints order_seq). If the VSI console had already imported the order
// (erp_exported_at set), re-submitting clears that flag so the console re-imports
// the corrected data — the caller UI warns the staff member about this case.
export async function reopenOrderAction(
  orderId: string,
  reason: string,
): Promise<{ ok?: boolean; error?: string; emailError?: string }> {
  try {
    if (!reason?.trim()) return { error: 'A reason for the client is required.' }

    const scope = await getAdminScope()
    if (!scope) return { error: 'Not authenticated' }
    if (!scope.canApproveOrders) return { error: 'Not authorized' }

    const service = createServiceClient()
    const { data: order, error: fetchErr } = await service
      .from('orders')
      .select('status, production_state, erp_exported_at, user_id, company_id, order_seq, reference_customer, locale, products(colour_id, style_name)')
      .eq('id', orderId)
      .single()
    if (fetchErr) return { error: fetchErr.message }
    if (!order) return { error: 'Order not found' }

    // Branch staff can only act within their model/company scope.
    if (!scope.allModels) {
      const style = (order as { products?: { style_name?: string } }).products?.style_name
      if (!scope.canModel(style)) return { error: 'Not authorized' }
      if (!scope.canCompany(order.company_id)) return { error: 'Not authorized' }
    }

    // Same window as soft-cancel: a live order that production has not touched.
    if (order.production_state) return { error: 'Order already in production' }
    if (order.status !== 'submitted' && order.status !== 'approved') {
      return { error: 'Only submitted or approved orders can be reopened' }
    }

    const imp = await getImpersonation()
    const actorId = imp?.adminId ?? scope.userId
    const { error } = await service.from('orders').update({
      status:        'changes_requested',
      reopened_at:   new Date().toISOString(),
      reopened_by:   actorId,
      reopen_reason: reason.trim(),
    }).eq('id', orderId)
    if (error) return { error: error.message }

    await logAdminAction({
      actorId,
      actorRole: imp ? 'piedro_admin' : scope.role,
      action:    'order_reopen',
      orderId,
      details:   {
        previous_status: order.status,
        reason: reason.trim(),
        erp_exported: !!order.erp_exported_at,
        ...(imp ? { target_name: imp.targetName } : {}),
      },
      impersonatedAsUserId: imp?.targetId,
    })

    // Notify the order's creator (in the order's locale) that their order is
    // unlocked for edits. Email failure never rolls back the reopen — the client
    // also sees the banner + chip in the portal.
    const emailError = await sendReopenEmail(service, orderId, order, reason.trim())
    return { ok: true, ...(emailError ? { emailError } : {}) }
  } catch (e) {
    console.error('reopenOrderAction threw', e)
    return { error: e instanceof Error ? e.message : 'Unexpected error' }
  }
}

// Undo a reopen (client unreachable / requested by mistake): the order returns to
// the status its approval state implies, and the reopen context is cleared (the
// admin_actions trail keeps the history).
export async function undoReopenAction(
  orderId: string,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const scope = await getAdminScope()
    if (!scope) return { error: 'Not authenticated' }
    if (!scope.canApproveOrders) return { error: 'Not authorized' }

    const service = createServiceClient()
    const { data: order, error: fetchErr } = await service
      .from('orders')
      .select('status, approval_state, company_id, products(style_name)')
      .eq('id', orderId)
      .single()
    if (fetchErr) return { error: fetchErr.message }
    if (!order) return { error: 'Order not found' }
    if (order.status !== 'changes_requested') return { error: 'Order is not reopened' }

    if (!scope.allModels) {
      const style = (order as { products?: { style_name?: string } }).products?.style_name
      if (!scope.canModel(style)) return { error: 'Not authorized' }
      if (!scope.canCompany(order.company_id)) return { error: 'Not authorized' }
    }

    const restored = order.approval_state === 'approved' ? 'approved' : 'submitted'
    const { error } = await service.from('orders').update({
      status: restored, reopened_at: null, reopened_by: null, reopen_reason: null,
    }).eq('id', orderId)
    if (error) return { error: error.message }

    const imp = await getImpersonation()
    await logAdminAction({
      actorId:   imp?.adminId ?? scope.userId,
      actorRole: imp ? 'piedro_admin' : scope.role,
      action:    'order_reopen_undo',
      orderId,
      details:   { restored_status: restored, ...(imp ? { target_name: imp.targetName } : {}) },
      impersonatedAsUserId: imp?.targetId,
    })
    return { ok: true }
  } catch (e) {
    console.error('undoReopenAction threw', e)
    return { error: e instanceof Error ? e.message : 'Unexpected error' }
  }
}

// Branded notification to the order's creator, in the order's locale. Returns an
// error string (for surfacing to staff) instead of throwing — best-effort only.
async function sendReopenEmail(
  service: ReturnType<typeof createServiceClient>,
  orderId: string,
  order: {
    user_id?: string | null
    order_seq?: number | null
    reference_customer?: string | null
    locale?: string | null
    products?: { colour_id?: string } | { colour_id?: string }[] | null
  },
  reason: string,
): Promise<string | undefined> {
  try {
    if (!order.user_id) return 'Order has no owner to notify'
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return 'Email service not configured (RESEND_API_KEY missing)'

    const [{ data: owner }, settings] = await Promise.all([
      service.from('profiles').select('email, full_name').eq('id', order.user_id).single(),
      getSettings(['email_from']),
    ])
    const from = settings.email_from || process.env.EMAIL_FROM
    if (!owner?.email || !from) return 'Sender or recipient email not configured'

    const t = await getTranslations({ locale: order.locale ?? 'en', namespace: 'emails' })
    const product = Array.isArray(order.products) ? order.products[0] : order.products
    const ref = (order.order_seq != null ? `#${orderNumber(order.order_seq)}` : null)
      ?? order.reference_customer ?? orderId.slice(0, 8)
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.piedro.pt'
    const link = `${site}/${order.locale ?? 'en'}/orders/${orderId}`

    const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#C9A96E;margin:0 0 24px">Piedro Portal</p>
      <h2 style="font-size:18px;font-weight:600;color:#1C1917;margin:0 0 12px">${escapeHtml(t('reopen_heading', { ref }))}</h2>
      <p style="font-size:14px;color:#44403C;margin:0 0 20px">${escapeHtml(t('reopen_intro', { model: product?.colour_id ?? '—' }))}</p>
      <div style="margin:0 0 20px;padding:12px 16px;background:#FAF8F4;border-left:3px solid #C9A96E;border-radius:6px">
        <p style="font-size:12px;color:#78716C;margin:0 0 4px">${escapeHtml(t('reopen_reason_label'))}</p>
        <p style="font-size:14px;font-weight:500;color:#1C1917;margin:0;white-space:pre-wrap">${escapeHtml(reason)}</p>
      </div>
      <a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 22px;background:#B8975A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px">${escapeHtml(t('reopen_cta'))}</a>
      <p style="font-size:12px;color:#A8A29E;margin-top:24px">${escapeHtml(t('reopen_footer'))}</p>
    </div>`

    const { error } = await new Resend(apiKey).emails.send({
      from,
      to: [owner.email],
      subject: t('reopen_subject', { ref }),
      html,
    }).catch((e: Error) => ({ error: { message: e.message } }))
    return error ? String((error as { message?: string }).message ?? error) : undefined
  } catch (e) {
    console.error('sendReopenEmail threw', e)
    return e instanceof Error ? e.message : 'Email failed'
  }
}

export async function translateTextAction(
  text: string,
  targetLang: 'en' | 'pt' | 'nl' | 'fr' | 'de',
): Promise<{ translation?: string; error?: string }> {
  if (!text?.trim()) return { translation: '' }
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'Translation not available (ANTHROPIC_API_KEY not set)' }

  try {
    // Lazy import so this module never fails to load if the SDK has a load-time issue
    // (a failed top-level import here would 500 every action in this file).
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const LANGS: Record<string, string> = {
      en: 'English', pt: 'Portuguese (European)', nl: 'Dutch', fr: 'French', de: 'German',
    }
    const lang = LANGS[targetLang] ?? 'English'
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: `Translate to ${lang}. Return ONLY the translation:\n\n${text}` }],
    })
    const translation = response.content[0].type === 'text' ? response.content[0].text : ''
    return { translation }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Translation failed' }
  }
}
