/**
 * Role helpers — single source of truth for back-office privilege checks.
 *
 * Hierarchy: user · company_admin · branch_staff · piedro_admin · super_admin.
 * `super_admin` (infrastructure/technical owner) is a strict superset of
 * `piedro_admin` (Piedro operational admin) plus infra-only tools (e.g. the
 * unassigned-orders view). Always check privileges through these helpers so a
 * new high role automatically inherits the lower one's access.
 */

export function isPiedroAdmin(role?: string | null): boolean {
  return role === 'piedro_admin' || role === 'super_admin'
}

export function isSuperAdmin(role?: string | null): boolean {
  return role === 'super_admin'
}

/**
 * A branch_admin may create/view orders on behalf of the clients linked to the
 * branch office(s) they administer. This is a narrow capability — it grants NO
 * back-office access (catalogue, companies, email, etc.). The authoritative
 * membership lives in the `branch_admins` table; this role string is the
 * client-side label/gate set when a user is assigned to a branch.
 */
export function isBranchAdmin(role?: string | null): boolean {
  return role === 'branch_admin'
}

/**
 * A branch_staff may register orders on behalf of the clients of the single
 * branch office they belong to (profiles.branch_id), WITHOUT any back-office
 * admin powers. The clients/models they may order for are resolved the same way
 * as a branch_admin's — see getAdminBranchIds in src/lib/branch-admin.ts.
 */
export function isBranchStaff(role?: string | null): boolean {
  return role === 'branch_staff'
}
