import { createServiceClient } from './supabase/service'

export type UserCompany = {
  user_id: string
  company_id: string
  is_company_admin: boolean
  created_at: string
}

export type CompanyWithAdminFlag = {
  id: string
  name: string
  erp_code: string
  is_company_admin: boolean
}

/**
 * Get all companies associated with a user
 * @returns Array of companies with admin flag
 */
export async function getUserCompanies(userId: string): Promise<CompanyWithAdminFlag[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('user_companies')
    .select(`
      company_id,
      is_company_admin,
      companies (id, name, erp_code)
    `)
    .eq('user_id', userId)

  if (error || !data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((uc: any) => ({
    id: uc.companies.id,
    name: uc.companies.name,
    erp_code: uc.companies.erp_code,
    is_company_admin: uc.is_company_admin,
  }))
}

/**
 * Get array of company IDs for a user (useful for queries)
 */
export async function getUserCompanyIds(userId: string): Promise<string[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)

  if (error || !data) return []

  return data.map((uc) => uc.company_id)
}

/**
 * Check if user is company_admin of a specific company
 */
export async function isCompanyAdmin(userId: string, companyId: string): Promise<boolean> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('user_companies')
    .select('is_company_admin')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single()

  if (error || !data) return false

  return data.is_company_admin
}

/**
 * Get companies where user is admin
 */
export async function getAdminCompanies(userId: string): Promise<CompanyWithAdminFlag[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('user_companies')
    .select(`
      company_id,
      is_company_admin,
      companies (id, name, erp_code)
    `)
    .eq('user_id', userId)
    .eq('is_company_admin', true)

  if (error || !data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((uc: any) => ({
    id: uc.companies.id,
    name: uc.companies.name,
    erp_code: uc.companies.erp_code,
    is_company_admin: true,
  }))
}

/**
 * Get company IDs where user is admin (useful for order queries)
 */
export async function getAdminCompanyIds(userId: string): Promise<string[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
    .eq('is_company_admin', true)

  if (error || !data) return []

  return data.map((uc) => uc.company_id)
}

/**
 * Get the exclusive labels (siglas) of every company the user belongs to — the
 * union of the N:N `company_exclusives` table and the legacy single
 * `companies.exclusive_label`. A product is visible when one of its siglas
 * matches one of these (see src/lib/exclusive.ts). Uppercased, de-duplicated.
 */
export async function getUserExclusiveLabels(userId: string): Promise<string[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('user_companies')
    .select('company_id, companies (exclusive_label)')
    .eq('user_id', userId)

  if (error || !data) return []

  const labels = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const uc of data as any[]) {
    const legacy = (uc.companies?.exclusive_label ?? '').trim().toUpperCase()
    if (legacy) labels.add(legacy)
  }

  const companyIds = (data as { company_id: string }[]).map((d) => d.company_id)
  if (companyIds.length) {
    // Resilient: if the table isn't present yet (migration 016) just use legacy.
    const { data: ce } = await service
      .from('company_exclusives')
      .select('label')
      .in('company_id', companyIds)
    for (const r of (ce ?? []) as { label: string }[]) {
      const l = (r.label ?? '').trim().toUpperCase()
      if (l) labels.add(l)
    }
  }

  return [...labels]
}

/**
 * Check if user has any company associated
 */
export async function hasAnyCompany(userId: string): Promise<boolean> {
  const service = createServiceClient()

  const { count, error } = await service
    .from('user_companies')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) return false

  return (count ?? 0) > 0
}
