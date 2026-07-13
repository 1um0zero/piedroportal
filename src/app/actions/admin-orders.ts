'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'
import { logAdminAction } from '@/lib/admin/audit'
import { getImpersonation } from '@/lib/impersonation'
import { sendReopenClientEmail } from '@/lib/reopen-emails'
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

    // Reopen window: a live order the FACTORY has not touched. 'order_received'
    // only means the VSI console imported it (stage 0, sets status in_production)
    // — still reopenable, with the extra ERP warning in the UI; any later stage
    // means real work started and the order is locked.
    const consoleOnly = order.production_state === 'order_received'
    if (order.production_state && !consoleOnly) return { error: 'Order already in production' }
    const statusOk = order.status === 'submitted' || order.status === 'approved'
      || (order.status === 'in_production' && consoleOnly)
    if (!statusOk) return { error: 'Only submitted or approved orders can be reopened' }

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
    const emailError = await sendReopenClientEmail(service, 'reopened', { ...order, id: orderId }, reason.trim())
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
      .select('status, approval_state, production_state, company_id, products(style_name)')
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

    // production_state is untouched while reopened, so it tells us whether the
    // order was already at the console (order_received → status in_production).
    const restored = order.production_state ? 'in_production'
      : order.approval_state === 'approved' ? 'approved' : 'submitted'
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
