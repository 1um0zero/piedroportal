'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

const VALID_STATUSES = ['submitted', 'in_review', 'approved', 'in_production', 'shipped', 'delivered', 'cancelled']

export async function updateOrderAdminAction(
  orderId: string,
  fields: { status?: string; piedro_order_id?: string; piedro_notes?: string },
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'piedro_admin') return { error: 'Not authorized' }

  if (fields.status && !VALID_STATUSES.includes(fields.status)) return { error: 'Invalid status' }

  const service = createServiceClient()
  const { error } = await service.from('orders').update(fields).eq('id', orderId)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function translateTextAction(
  text: string,
  targetLang: 'en' | 'pt',
): Promise<{ translation?: string; error?: string }> {
  if (!text?.trim()) return { translation: '' }
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'Translation not available' }

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
