'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

// ── Dataverse-aligned status values ───────────────────────────────────────────

export const APPROVAL_STATES = [
  { value: 'registered',       label: 'Registered',        color: 'bg-stone-100 text-stone-500' },
  { value: 'under_analysis',   label: 'Under Analysis',    color: 'bg-yellow-50 text-yellow-700' },
  { value: 'approved',         label: 'Approved',          color: 'bg-green-50 text-green-700' },
  { value: 'refused',          label: 'Refused',           color: 'bg-red-50 text-red-600' },
  { value: 'need_attention',   label: 'Need Attention',    color: 'bg-orange-50 text-orange-600' },
  { value: 'awaiting_payment', label: 'Awaiting Payment',  color: 'bg-blue-50 text-blue-600' },
] as const

export const PRODUCTION_STATES = [
  { value: 'order_received',  label: 'Order Received' },
  { value: 'in_preparation',  label: 'In Preparation' },
  { value: 'cutting',         label: 'Cutting' },
  { value: 'stitching',       label: 'Stitching' },
  { value: 'mounting',        label: 'Mounting' },
  { value: 'finishing',       label: 'Finishing' },
  { value: 'fitting',         label: 'Fitting' },
  { value: 'modeling',        label: 'Modeling' },
  { value: 'preparing',       label: 'Preparing' },
  { value: 'delivered',       label: 'Delivered' },
] as const

export type ApprovalState   = (typeof APPROVAL_STATES)[number]['value']
export type ProductionState = (typeof PRODUCTION_STATES)[number]['value']

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
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'piedro_admin') return { error: 'Not authorized' }

  // Validation: cannot approve without Piedro Order ID
  if (fields.approval_state === 'approved') {
    const service = createServiceClient()
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

  const service = createServiceClient()
  const { error } = await service.from('orders').update(update).eq('id', orderId)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function translateTextAction(
  text: string,
  targetLang: 'en' | 'pt',
): Promise<{ translation?: string; error?: string }> {
  if (!text?.trim()) return { translation: '' }
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'Translation not available (ANTHROPIC_API_KEY not set)' }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const lang = targetLang === 'en' ? 'English' : 'Portuguese (European)'
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
