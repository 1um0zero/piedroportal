import { createServiceClient } from './supabase/service'

export type BranchCompany = { id: string; name: string; erp_code: string }

/**
 * Branch offices a user may order on behalf of. Two sources, unioned:
 *   - branch_admins rows — a branch_admin administers (orders + manages) these.
 *   - profiles.branch_id — a branch_staff belongs to this single branch and may
 *     register orders for its clients (no admin powers).
 * The role string is NOT the authoritative source for branch_admin membership
 * (that is the branch_admins table); it only gates the branch_staff branch_id.
 */
export async function getAdminBranchIds(userId: string): Promise<string[]> {
  const service = createServiceClient()
  const [{ data: admins }, { data: profile }] = await Promise.all([
    service.from('branch_admins').select('branch_id').eq('user_id', userId),
    service.from('profiles').select('role, branch_id').eq('id', userId).single(),
  ])
  const ids = new Set((admins ?? []).map(r => r.branch_id as string))
  if (profile?.role === 'branch_staff' && profile.branch_id) {
    ids.add(profile.branch_id as string)
  }
  return [...ids]
}

/**
 * Distinct company IDs the user may order for as a branch admin = the clients
 * linked (branch_companies) to every branch office they administer.
 */
export async function getBranchAdminCompanyIds(userId: string): Promise<string[]> {
  const branchIds = await getAdminBranchIds(userId)
  if (!branchIds.length) return []
  const service = createServiceClient()

  // Explicit clients linked to the user's branches.
  const { data: explicit } = await service
    .from('branch_companies')
    .select('company_id')
    .in('branch_id', branchIds)
  const ids = new Set((explicit ?? []).map(r => r.company_id as string))

  // Catch-all: if any of the user's branches handles unassigned clients, add every
  // company that is not explicitly linked to ANY branch.
  const { data: branches } = await service
    .from('branches')
    .select('id, handles_unassigned_clients')
    .in('id', branchIds)
  const hasCatchAll = (branches ?? []).some(b => b.handles_unassigned_clients)
  if (hasCatchAll) {
    const [{ data: allCompanies }, { data: claimed }] = await Promise.all([
      service.from('companies').select('id'),
      service.from('branch_companies').select('company_id'),
    ])
    const claimedSet = new Set((claimed ?? []).map(r => r.company_id as string))
    for (const c of allCompanies ?? []) {
      if (!claimedSet.has(c.id as string)) ids.add(c.id as string)
    }
  }

  return [...ids]
}

/** Same as getBranchAdminCompanyIds, but resolved to {id,name,erp_code} for pickers. */
export async function getBranchAdminCompanies(userId: string): Promise<BranchCompany[]> {
  const ids = await getBranchAdminCompanyIds(userId)
  if (!ids.length) return []
  const service = createServiceClient()
  const { data, error } = await service
    .from('companies')
    .select('id, name, erp_code')
    .in('id', ids)
    .order('name')
  if (error || !data) return []
  return data as BranchCompany[]
}

/** True when the user administers at least one branch office. */
export async function isBranchAdminUser(userId: string): Promise<boolean> {
  return (await getAdminBranchIds(userId)).length > 0
}
