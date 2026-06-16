'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserExclusiveLabels } from '@/lib/user-companies'
import { getBranchAdminCompanyIds } from '@/lib/branch-admin'
import { isPiedroAdmin, isBranchAdmin, isBranchStaff } from '@/lib/roles'
import { isExclusiveVisible } from '@/lib/exclusive'
import type { Product } from '@/types'

// Same fields the Gallery uses (see GalleryPage FIELDS) + exclusive for matching.
const FIELDS = [
  'id', 'style_name', 'colour_id', 'picture_name', 'section',
  'closure', 'type', 'color_basic', 'color_name',
  'size_first', 'size_last', 'size_unit', 'diabetics', 'new_until', 'constructions',
  'exclusive',
].join(',')

/**
 * Returns the active, customer-exclusive products visible to the signed-in user
 * (across all sections). The public gallery deliberately excludes every
 * exclusive product; the client overlays this result on top. A product's
 * `exclusive` may list several siglas — visible on a token intersection with the
 * user's siglas. piedro_admins see every exclusive model.
 *
 * Returns [] for anonymous users, or non-admins whose companies have no sigla.
 */
export async function getMyExclusiveProducts(): Promise<Product[]> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = isPiedroAdmin(profile?.role)
  const isBranch = isBranchAdmin(profile?.role) || isBranchStaff(profile?.role)

  // The siglas this user may see. Branch admin/staff additionally always get LIV
  // plus the siglas of every client company linked to the branches they consult.
  const labels = new Set(await getUserExclusiveLabels(user.id))
  if (isBranch) {
    labels.add('LIV')
    const companyIds = await getBranchAdminCompanyIds(user.id)
    if (companyIds.length) {
      const svc = createServiceClient()
      const { data: ce } = await svc.from('company_exclusives').select('label').in('company_id', companyIds)
      for (const r of (ce ?? []) as { label: string }[]) {
        const l = (r.label ?? '').trim().toUpperCase()
        if (l) labels.add(l)
      }
    }
  }
  if (!isAdmin && labels.size === 0) return []
  const labelSet = labels

  const service = createServiceClient()
  const { data } = await service
    .from('products')
    .select(FIELDS)
    .eq('active', true)
    .not('exclusive', 'is', null)
    .neq('exclusive', '')
    .order('style_name')

  return ((data ?? []) as unknown as (Product & { exclusive: string })[])
    .filter((p) => isExclusiveVisible(p.exclusive, labelSet, isAdmin))
}
