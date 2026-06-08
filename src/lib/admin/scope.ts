import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin, isSuperAdmin } from '@/lib/roles'
import type { UserRole } from '@/types'

/**
 * Back-office access scope for the current user — the single source of truth for
 * which catalogue models (= products.style_name) a user may see/manage.
 *
 *   - piedro_admin      → allModels=true, canModel() always true.
 *   - branch_staff with a branch:
 *       sees_full_catalogue=true  → canModel(s) = !models.has(s)  (list is exclusions)
 *       sees_full_catalogue=false → canModel(s) =  models.has(s)  (list is inclusions)
 *   - branch_staff without a branch → empty scope (canModel always false).
 */
export interface AdminScope {
  userId: string
  role: UserRole
  branchId: string | null
  allModels: boolean
  canModel(styleName: string | null | undefined): boolean
}

/**
 * Resolve the current user's back-office scope.
 * Returns `null` when the user is not a back-office user (no access).
 */
export async function getAdminScope(): Promise<AdminScope | null> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles').select('role, branch_id').eq('id', user.id).single()

  const role = profile?.role as UserRole | undefined
  // super_admin (infra/technical) is a superset of piedro_admin (operational).
  if (isPiedroAdmin(role)) {
    return { userId: user.id, role: role!, branchId: null, allModels: true, canModel: () => true }
  }

  if (role === 'branch_staff') {
    const branchId = (profile?.branch_id as string | null) ?? null
    if (!branchId) {
      // Staff not yet attached to a branch — no catalogue access.
      return { userId: user.id, role, branchId: null, allModels: false, canModel: () => false }
    }

    const [{ data: branch }, { data: rows }] = await Promise.all([
      service.from('branches').select('sees_full_catalogue').eq('id', branchId).single(),
      service.from('branch_models').select('style_name').eq('branch_id', branchId),
    ])
    const seesFull = branch?.sees_full_catalogue ?? true
    const models = new Set((rows ?? []).map(r => r.style_name as string))

    const canModel = (styleName: string | null | undefined): boolean => {
      if (!styleName) return seesFull // products without a model only visible to full-catalogue branches
      return seesFull ? !models.has(styleName) : models.has(styleName)
    }
    // allModels is true only for a full-catalogue branch with no exclusions.
    return { userId: user.id, role, branchId, allModels: seesFull && models.size === 0, canModel }
  }

  // Regular users / company_admins have no back-office access.
  return null
}

/**
 * Server-component guard: requires back-office access (piedro_admin or a
 * branch_staff attached to a branch). Redirects to the gallery otherwise.
 */
export async function requireBackofficePage(): Promise<AdminScope> {
  const scope = await getAdminScope()
  if (!scope) redirect('/gallery')
  // A branch_staff with no branch attached has no usable scope.
  if (scope.role === 'branch_staff' && !scope.branchId) redirect('/gallery')
  return scope
}

/** Server-component guard: requires piedro_admin (or super_admin). Redirects to the gallery otherwise. */
export async function requirePiedroAdminPage(): Promise<AdminScope> {
  const scope = await getAdminScope()
  if (!scope || !isPiedroAdmin(scope.role)) redirect('/gallery')
  return scope
}

/** Server-component guard: requires super_admin (infrastructure/technical). */
export async function requireSuperAdminPage(): Promise<AdminScope> {
  const scope = await getAdminScope()
  if (!scope || !isSuperAdmin(scope.role)) redirect('/gallery')
  return scope
}
