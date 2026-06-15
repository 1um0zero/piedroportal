import { createServiceClient } from './supabase/service'

export type BranchCompany = { id: string; name: string; erp_code: string }

/**
 * Branch offices a user administers (rows in `branch_admins`). This — not the
 * profiles.role string — is the authoritative source of branch-admin membership.
 */
export async function getAdminBranchIds(userId: string): Promise<string[]> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('branch_admins')
    .select('branch_id')
    .eq('user_id', userId)
  if (error || !data) return []
  return data.map(r => r.branch_id as string)
}

/**
 * Distinct company IDs the user may order for as a branch admin = the clients
 * linked (branch_companies) to every branch office they administer.
 */
export async function getBranchAdminCompanyIds(userId: string): Promise<string[]> {
  const branchIds = await getAdminBranchIds(userId)
  if (!branchIds.length) return []
  const service = createServiceClient()
  const { data, error } = await service
    .from('branch_companies')
    .select('company_id')
    .in('branch_id', branchIds)
  if (error || !data) return []
  return [...new Set(data.map(r => r.company_id as string))]
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
