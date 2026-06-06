import { createServiceClient } from '@/lib/supabase/service'

export type BranchTarget = { email: string; locale: 'en' | 'nl' | 'fr' | 'de' }

/**
 * Branches that should receive a copy of an order for the given product model.
 * A branch is in scope using the same rule as the back-office (see getAdminScope):
 *   sees_full_catalogue → in scope unless the model is in its exclusion list;
 *   else               → in scope only if the model is in its inclusion list.
 * Only branches with a configured notify_email are returned, each with its own locale.
 */
export async function getBranchNotifyTargets(styleName: string | null | undefined): Promise<BranchTarget[]> {
  const service = createServiceClient()
  const [{ data: branches }, { data: models }] = await Promise.all([
    service.from('branches').select('id, sees_full_catalogue, notify_email, notify_locale'),
    service.from('branch_models').select('branch_id, style_name'),
  ])
  if (!branches) return []

  const modelsByBranch = new Map<string, Set<string>>()
  for (const m of models ?? []) {
    if (!modelsByBranch.has(m.branch_id)) modelsByBranch.set(m.branch_id, new Set())
    modelsByBranch.get(m.branch_id)!.add(m.style_name as string)
  }

  const targets: BranchTarget[] = []
  for (const b of branches) {
    const email = (b.notify_email ?? '').trim()
    if (!email) continue
    const set = modelsByBranch.get(b.id) ?? new Set<string>()
    const inScope = styleName
      ? (b.sees_full_catalogue ? !set.has(styleName) : set.has(styleName))
      : b.sees_full_catalogue
    if (inScope) {
      const locale = (['en', 'nl', 'fr', 'de'].includes(b.notify_locale) ? b.notify_locale : 'en') as BranchTarget['locale']
      targets.push({ email, locale })
    }
  }
  return targets
}
