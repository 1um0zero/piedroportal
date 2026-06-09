'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserExclusiveLabels } from '@/lib/user-companies'
import { isPiedroAdmin } from '@/lib/roles'
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

  const labels = await getUserExclusiveLabels(user.id)
  if (!isAdmin && labels.length === 0) return []
  const labelSet = new Set(labels)

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
