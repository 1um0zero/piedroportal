'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserExclusiveLabels } from '@/lib/user-companies'
import type { Product } from '@/types'

// Same fields the Gallery uses (see GalleryPage FIELDS).
const FIELDS = [
  'id', 'style_name', 'colour_id', 'picture_name', 'section',
  'closure', 'type', 'color_basic', 'color_name',
  'size_first', 'size_last', 'diabetics', 'new_until', 'constructions',
].join(',')

/**
 * Returns the active, customer-exclusive products visible to the signed-in user
 * (across all sections). The public gallery deliberately excludes every
 * exclusive product; the client overlays this result on top.
 *
 * Returns [] for anonymous users or users whose companies have no exclusive label.
 */
export async function getMyExclusiveProducts(): Promise<Product[]> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []

  const labels = await getUserExclusiveLabels(user.id)
  if (labels.length === 0) return []

  const service = createServiceClient()
  const { data } = await service
    .from('products')
    .select(FIELDS)
    .eq('active', true)
    .in('exclusive', labels)
    .order('style_name')

  return (data ?? []) as unknown as Product[]
}
