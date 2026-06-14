'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasChatConsent, recordChatConsent, recordChatFeedback } from '@/lib/chat-consent'

/** Does the current user still need to accept the assistant notice? */
export async function getChatConsentStatus(): Promise<{ needsConsent: boolean }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { needsConsent: true }
  return { needsConsent: !(await hasChatConsent(user.id)) }
}

/** Record the current user's acceptance of the assistant notice. */
export async function acceptChatConsent(locale: string): Promise<{ ok: boolean }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false }

  const { data: profile } = await createServiceClient()
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  await recordChatConsent(user.id, user.email ?? '', profile?.full_name ?? '', locale)
  return { ok: true }
}

/** Flag an assistant answer as "should be improved". */
export async function submitChatFeedback(
  question: string,
  answer: string,
): Promise<{ ok: boolean }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false }

  const { data: profile } = await createServiceClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  await recordChatFeedback(user.id, profile?.role ?? null, question.slice(0, 4000), answer.slice(0, 8000))
  return { ok: true }
}
