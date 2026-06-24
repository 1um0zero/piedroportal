import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin, isSuperAdmin, isStaffViewer } from '@/lib/roles'
import { isExclusiveVisible, exclusiveTokens } from '@/lib/exclusive'
import type { UserRole } from '@/types'

/**
 * Back-office access scope for the current user — the single source of truth for
 * which catalogue models (= products.style_name) a user may see/manage.
 *
 *   - piedro_admin      → allModels=true, canModel() always true.
 *   - branch_staff on a TOKEN-SCOPED branch (branches.exclusive_label set, e.g. UK):
 *       canModel(s) = the style has any colour that is general OR carries the
 *       branch sigla — reusing the client token engine (src/lib/exclusive.ts).
 *       readonlyCatalogue=true (these staff consult, they don't manage models).
 *   - branch_staff on a legacy branch (exclusive_label NULL):
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
  /** Token-scoped (e.g. UK) staff consult the catalogue but cannot manage it. */
  readonlyCatalogue: boolean
  /**
   * Granular capability — may APPROVE orders (set the Piedro Order # + approval
   * state) within `canModel` scope. Always true for piedro_admin/super_admin;
   * for branch_staff it mirrors profiles.can_approve_orders. This is a WRITE
   * permission only — it grants no other back-office area.
   */
  canApproveOrders: boolean
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
    .from('profiles').select('role, branch_id, can_approve_orders').eq('id', user.id).single()

  const role = profile?.role as UserRole | undefined
  // super_admin (infra/technical) is a superset of piedro_admin (operational).
  if (isPiedroAdmin(role)) {
    return { userId: user.id, role: role!, branchId: null, allModels: true, canModel: () => true, readonlyCatalogue: false, canApproveOrders: true }
  }

  // Granular order-approval capability — only meaningful for branch_staff (other
  // non-admin roles never reach the back-office order controls).
  const canApproveOrders = profile?.can_approve_orders === true

  if (role === 'branch_staff') {
    const branchId = (profile?.branch_id as string | null) ?? null
    if (!branchId) {
      // Staff not yet attached to a branch — no catalogue access.
      return { userId: user.id, role, branchId: null, allModels: false, canModel: () => false, readonlyCatalogue: true, canApproveOrders }
    }

    const { data: branch } = await service
      .from('branches').select('sees_full_catalogue, exclusive_label').eq('id', branchId).single()

    // ── Token-scoped branch (e.g. UK): general catalogue + own sigla ──────────
    const token = (branch?.exclusive_label as string | null ?? '').trim()
    if (token) {
      const labels = new Set<string>(exclusiveTokens(token))
      labels.add('LIV') // Livingstone classification is visible to every back-office user
      // Precompute the set of styles with at least one visible colour. A style is
      // visible when any of its rows is general or carries the branch sigla — the
      // exact same gate the client gallery applies, but rolled up to style_name so
      // every existing canModel() caller keeps working unchanged.
      const { data: prods } = await service.from('products').select('style_name, exclusive')
      const visibleStyles = new Set<string>()
      for (const p of (prods ?? []) as { style_name: string | null; exclusive: string | null }[]) {
        if (p.style_name && isExclusiveVisible(p.exclusive, labels, false)) visibleStyles.add(p.style_name)
      }
      const canModel = (styleName: string | null | undefined): boolean =>
        !!styleName && visibleStyles.has(styleName)
      return { userId: user.id, role, branchId, allModels: false, canModel, readonlyCatalogue: true, canApproveOrders }
    }

    // ── Legacy branch: style_name inclusion/exclusion list ────────────────────
    const { data: rows } = await service
      .from('branch_models').select('style_name').eq('branch_id', branchId)
    const seesFull = branch?.sees_full_catalogue ?? true
    const models = new Set((rows ?? []).map(r => r.style_name as string))

    const canModel = (styleName: string | null | undefined): boolean => {
      if (!styleName) return seesFull // products without a model only visible to full-catalogue branches
      return seesFull ? !models.has(styleName) : models.has(styleName)
    }
    // allModels is true only for a full-catalogue branch with no exclusions.
    return { userId: user.id, role, branchId, allModels: seesFull && models.size === 0, canModel, readonlyCatalogue: false, canApproveOrders }
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

/**
 * Server-component guard for catalogue-MANAGEMENT pages (import, edit, reorder,
 * image upload). Requires back-office access AND a non-read-only scope, so
 * token-scoped branch staff (e.g. UK) are sent back to the products list.
 */
export async function requireCatalogueWritePage(): Promise<AdminScope> {
  const scope = await requireBackofficePage()
  if (scope.readonlyCatalogue) redirect('/admin/products')
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

/**
 * Guard for the back-office ORDERS views (list + detail). Admits, in order:
 *   - staff_viewer → global, read-only (canWrite=false): sees every order, no edits;
 *   - piedro_admin/super_admin → global, read+write;
 *   - branch_staff → model-scoped, read-only on the admin edit controls
 *     (their writes were already server-rejected; canWrite=false keeps the UI honest).
 * Everyone else is redirected to the gallery. Unlike requireBackofficePage this does
 * NOT open products/drafts/etc. to staff_viewer — it is orders-only by construction.
 */
export async function requireOrdersViewPage(): Promise<{ scope: AdminScope; canWrite: boolean }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/gallery')

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single()

  if (isStaffViewer(profile?.role)) {
    return {
      scope: { userId: user.id, role: 'staff_viewer', branchId: null, allModels: true, canModel: () => true, readonlyCatalogue: true, canApproveOrders: false },
      canWrite: false,
    }
  }

  // piedro_admin / super_admin (full) or branch_staff (model-scoped); others redirected.
  // canWrite covers the approval controls: full admins always, plus a branch_staff
  // carrying the granular orders_approval capability (still model-scoped server-side).
  const scope = await requireBackofficePage()
  return { scope, canWrite: scope.canApproveOrders }
}
