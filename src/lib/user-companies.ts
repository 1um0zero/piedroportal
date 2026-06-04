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
 * Get the exclusive labels (siglas) of every company the user belongs to.
 * A product is visible to the user when its `exclusive` matches one of these.
 * Returns uppercased, de-duplicated, non-empty labels.
 */
export async function getUserExclusiveLabels(userId: string): Promise<string[]> {
  const service = createServiceClient()

  const { data, error } = await service
    .from('user_companies')
    .select('companies (exclusive_label)')
    .eq('user_id', userId)

  if (error || !data) return []

  const labels = data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((uc: any) => (uc.companies?.exclusive_label ?? '').trim().toUpperCase())
    .filter(Boolean)

  return [...new Set(labels)]
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
