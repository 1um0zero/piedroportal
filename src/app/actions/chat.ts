'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasChatConsent, recordChatConsent, recordChatFeedback } from '@/lib/chat-consent'
import { getImpersonation } from '@/lib/impersonation'

/** Does the current user still need to accept the assistant notice? */
export async function getChatConsentStatus(): Promise<{ needsConsent: boolean }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { needsConsent: true }
  return { needsConsent: !(await hasChatConsent(user.id)) }
}

/**
 * Record the current user's acceptance of the assistant notice.
 *
 * REFUSED under "view as": impersonation runs on the target's real session, so
 * an admin clicking accept would file a GDPR consent record in the client's name
 * — and email that client "you accepted the notice" — for something the client
 * never did. Consent is personal: nobody accepts it on someone else's behalf.
 * The admin simply cannot use the assistant as a user who has not consented.
 */
export async function acceptChatConsent(
  locale: string,
): Promise<{ ok: boolean; reason?: 'impersonating' }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false }

  const imp = await getImpersonation()
  if (imp?.targetId === user.id) return { ok: false, reason: 'impersonating' }

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

  const [{ data: profile }, imp] = await Promise.all([
    createServiceClient().from('profiles').select('role').eq('id', user.id).single(),
    getImpersonation(),
  ])

  await recordChatFeedback(
    user.id,
    profile?.role ?? null,
    question.slice(0, 4000),
    answer.slice(0, 8000),
    imp?.targetId === user.id ? imp.adminId : null,
  )
  return { ok: true }
}
