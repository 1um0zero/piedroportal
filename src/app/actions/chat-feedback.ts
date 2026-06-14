'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isSuperAdmin } from '@/lib/roles'
import { revalidatePath } from 'next/cache'

/** Mark a feedback item reviewed or dismissed (super-admin only). */
export async function resolveChatFeedback(
  id: string,
  status: 'reviewed' | 'dismissed' | 'open',
): Promise<{ ok: boolean }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false }

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (!isSuperAdmin(profile?.role)) return { ok: false }

  await service
    .from('chat_feedback')
    .update({
      status,
      reviewed_by: status === 'open' ? null : user.id,
      reviewed_at: status === 'open' ? null : new Date().toISOString(),
    })
    .eq('id', id)

  revalidatePath('/admin/chat-feedback')
  return { ok: true }
}
