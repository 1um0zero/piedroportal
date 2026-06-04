'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type UserRole = 'user' | 'company_admin' | 'piedro_admin' | 'branch_staff'

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

export async function toggleCompanyAdminAction(
  userId: string,
  companyId: string,
  isAdmin: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'piedro_admin') return { error: 'Not authorized' }

  const service = createServiceClient()

  // Update user_companies.is_company_admin
  const { error } = await service
    .from('user_companies')
    .update({ is_company_admin: isAdmin })
    .eq('user_id', userId)
    .eq('company_id', companyId)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function addUserCompanyAction(
  userId: string,
  companyId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'piedro_admin') return { error: 'Not authorized' }

  const service = createServiceClient()

  // Insert into user_companies
  const { error } = await service
    .from('user_companies')
    .insert({ user_id: userId, company_id: companyId, is_company_admin: false })

  if (error) return { error: error.message }
  return { ok: true }
}

export async function removeUserCompanyAction(
  userId: string,
  companyId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'piedro_admin') return { error: 'Not authorized' }

  const service = createServiceClient()

  // Delete from user_companies
  const { error } = await service
    .from('user_companies')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId)

  if (error) return { error: error.message }
  return { ok: true }
}
