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
