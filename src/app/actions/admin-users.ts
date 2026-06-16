'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin } from '@/lib/roles'

type UserRole = 'user' | 'company_admin' | 'piedro_admin' | 'branch_staff' | 'branch_admin' | 'super_admin'

export async function updateUserRoleAction(
  userId: string,
  role: UserRole,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(me?.role)) return { error: 'Not authorized' }

  // Prevent removing your own admin role
  if (userId === user.id && !isPiedroAdmin(role)) {
    return { error: 'Cannot remove your own admin role' }
  }

  const service = createServiceClient()
  const { error } = await service.from('profiles').update({ role }).eq('id', userId)
  if (error) return { error: error.message }
  return { ok: true }
}

/** Set a user's preferred portal language (null clears it). */
export async function updateUserLocaleAction(
  userId: string,
  locale: 'en' | 'nl' | 'fr' | 'de' | null,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(me?.role)) return { error: 'Not authorized' }

  if (locale !== null && !['en', 'nl', 'fr', 'de'].includes(locale)) {
    return { error: 'Invalid locale' }
  }

  const service = createServiceClient()
  const { error } = await service.from('profiles').update({ preferred_locale: locale }).eq('id', userId)
  if (error) return { error: error.message }
  return { ok: true }
}

/**
 * Safely delete a user (test/junk registrations). Refuses when the user has any
 * orders or stock orders — those users are real history and must be kept.
 */
export async function deleteUserAction(
  userId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(me?.role)) return { error: 'Not authorized' }
  if (userId === user.id) return { error: 'Cannot delete yourself' }

  const service = createServiceClient()
  const { data: target } = await service.from('profiles').select('role').eq('id', userId).single()
  if (isPiedroAdmin(target?.role)) return { error: 'Cannot delete an admin account' }

  // Hard guard: any linked orders (configured or stock) block deletion.
  const [{ count: orders }, { count: stockOrders }] = await Promise.all([
    service.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    service.from('stock_orders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  if ((orders ?? 0) + (stockOrders ?? 0) > 0) {
    return { error: `User has ${(orders ?? 0) + (stockOrders ?? 0)} order(s) — cannot delete` }
  }

  // Remove dependents first, then the profile, then the auth user.
  await service.from('user_companies').delete().eq('user_id', userId)
  await service.from('password_reset_tokens').delete().eq('user_id', userId)
  const { error: profErr } = await service.from('profiles').delete().eq('id', userId)
  if (profErr) return { error: profErr.message }
  const { error: authErr } = await service.auth.admin.deleteUser(userId)
  if (authErr) return { error: authErr.message }
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
  if (!isPiedroAdmin(me?.role)) return { error: 'Not authorized' }

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
  if (!isPiedroAdmin(me?.role)) return { error: 'Not authorized' }

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
  if (!isPiedroAdmin(me?.role)) return { error: 'Not authorized' }

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
