'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type UserRole = 'user' | 'company_admin' | 'piedro_admin'

export async function updateUserRoleAction(
  userId: string,
  role: UserRole,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'piedro_admin') return { error: 'Not authorized' }

  // Prevent removing your own admin role
  if (userId === user.id && role !== 'piedro_admin') {
    return { error: 'Cannot remove your own admin role' }
  }

  const service = createServiceClient()
  const { error } = await service.from('profiles').update({ role }).eq('id', userId)
  if (error) return { error: error.message }
  return { ok: true }
}
