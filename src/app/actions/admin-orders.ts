'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'
import Anthropic from '@anthropic-ai/sdk'
import type { ApprovalState, ProductionState } from '@/lib/order-status'

export type { ApprovalState, ProductionState }

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
  const scope = await getAdminScope()
  if (!scope) return { error: 'Not authenticated' }
  if (scope.role === 'branch_staff' && !scope.branchId) return { error: 'Not authorized' }

  const service = createServiceClient()

  // Branch staff can only act on orders whose product model is within their scope.
  if (!scope.allModels) {
    const { data: ord } = await service
      .from('orders').select('products(style_name)').eq('id', orderId).single()
    const style = (ord as { products?: { style_name?: string } } | null)?.products?.style_name
    if (!scope.canModel(style)) return { error: 'Not authorized' }
  }

  // Validation: cannot approve without Piedro Order ID
  if (fields.approval_state === 'approved') {
    const { data: order } = await service
      .from('orders')
      .select('piedro_order_id')
      .eq('id', orderId)
      .single()
    const currentPiedroId = fields.piedro_order_id ?? order?.piedro_order_id
    if (!currentPiedroId?.trim()) {
      return { error: 'Piedro Order # is required before approving.' }
    }
  }

  // Also update the portal status to keep them in sync
  const statusMap: Partial<Record<ApprovalState, string>> = {
    approved:         'approved',
    refused:          'cancelled',
    under_analysis:   'submitted',
    need_attention:   'submitted',
    awaiting_payment: 'submitted',
  }
  const update: Record<string, unknown> = { ...fields }
  if (fields.approval_state && statusMap[fields.approval_state]) {
    update.status = statusMap[fields.approval_state]
  }
  if (fields.production_state) {
    update.status = 'in_production'
  }

  const { error } = await service.from('orders').update(update).eq('id', orderId)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function translateTextAction(
  text: string,
  targetLang: 'en' | 'pt' | 'nl' | 'fr' | 'de',
): Promise<{ translation?: string; error?: string }> {
  if (!text?.trim()) return { translation: '' }
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'Translation not available (ANTHROPIC_API_KEY not set)' }

  try {
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
