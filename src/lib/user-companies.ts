import { createServiceClient } from './supabase/service'
import { exclusiveTokens } from './exclusive'
import { getBranchAdminCompanyIds } from './branch-admin'
import { isBranchAdmin, isBranchStaff } from './roles'

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
  // A label field may hold several siglas (e.g. "ZSM LIV") — tokenise so each is
  // matched independently. company_exclusives normally has one sigla per row, but
  // tokenising both sources keeps a combined value working everywhere.
  const addLabels = (raw: string | null | undefined) => {
    for (const t of exclusiveTokens(raw)) labels.add(t)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const uc of data as any[]) addLabels(uc.companies?.exclusive_label)

  const companyIds = (data as { company_id: string }[]).map((d) => d.company_id)
  if (companyIds.length) {
    // Resilient: if the table isn't present yet (migration 016) just use legacy.
    const { data: ce } = await service
      .from('company_exclusives')
      .select('label')
      .in('company_id', companyIds)
    for (const r of (ce ?? []) as { label: string }[]) addLabels(r.label)
  }

  return [...labels]
}

/**
 * Whether the user may see the general Piedro catalogue (the legacy "*" rule).
 * A user with no company sees it (normal/pending). With companies, it's the
 * most-permissive union: visible if ANY of their companies sees it. Only an
 * exclusive-only client (all companies `sees_general_catalogue = false`, e.g.
 * ZSM) is restricted to their own exclusive models. Resilient to migration 038
 * not being applied yet (treats a missing column as "sees general").
 */
export async function userSeesGeneralCatalogue(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('user_companies')
    .select('companies (sees_general_catalogue)')
    .eq('user_id', userId)

  if (error || !data || data.length === 0) return true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flags = (data as any[]).map((uc) => uc.companies?.sees_general_catalogue)
  // Any true (or null/undefined → treat as true) means the user sees the general set.
  return flags.some((f) => f !== false)
}

/**
 * Whether the user may see the customer-facing Additions Insights dashboard.
 * Opt-in per company (migration 059): true when ANY of the user's companies has
 * `insights_enabled = true`. A user with no companies, or whose companies all have
 * it off, does not. Resilient to migration 059 not being applied yet (a missing
 * column errors the select → treated as "off", so the feature simply stays hidden
 * until the migration runs). This is the single gate shared by the nav link and
 * the /orders/insights page guard.
 */
export async function userHasInsights(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('user_companies')
    .select('companies (insights_enabled)')
    .eq('user_id', userId)

  if (error || !data || data.length === 0) return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flags = (data as any[]).map((uc) => uc.companies?.insights_enabled)
  return flags.some((f) => f === true)
}

/**
 * The full set of exclusive siglas a user may see, branch-augmented.
 *
 * = the user's own company siglas (getUserExclusiveLabels), PLUS — for a
 * branch_admin/branch_staff — LIV and the siglas of every client company linked
 * to the branches they consult. This is the SINGLE source of truth shared by the
 * gallery overlay (getMyExclusiveProducts) and the product-detail visibility
 * guard, so a card that shows in the gallery never 404s on its detail page.
 */
export async function getVisibleExclusiveLabels(
  userId: string,
  role: string | null | undefined,
): Promise<Set<string>> {
  const labels = new Set(await getUserExclusiveLabels(userId))
  if (isBranchAdmin(role) || isBranchStaff(role)) {
    labels.add('LIV')
    const companyIds = await getBranchAdminCompanyIds(userId)
    if (companyIds.length) {
      const service = createServiceClient()
      const { data: ce } = await service
        .from('company_exclusives')
        .select('label')
        .in('company_id', companyIds)
      for (const r of (ce ?? []) as { label: string }[]) {
        const l = (r.label ?? '').trim().toUpperCase()
        if (l) labels.add(l)
      }
    }
  }
  return labels
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
