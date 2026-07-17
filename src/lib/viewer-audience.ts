import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin, isStaffViewer } from '@/lib/roles'
import type { AnnouncementAudience } from '@/lib/announcements-types'

/**
 * The announcement audiences the current viewer belongs to — i.e. the values of
 * `announcements.audience` that may be shown to them (see migration 058).
 *
 * Piedro back-office = piedro_admin / super_admin / staff_viewer (the VSI
 * consultant). Everyone else — clinics, company_admins, branch offices ordering
 * on behalf of clients, and anonymous homepage visitors — is a client: branch
 * staff DO need the factory-holiday notice.
 *
 * `cache` dedupes the lookup across every host mounted in the same request
 * (layout + page), so the extra profile read costs one query per render at most.
 */
export const getViewerAudiences = cache(async (): Promise<AnnouncementAudience[]> => {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return ['all', 'clients']

  // Service role: `profiles` RLS must not decide who counts as staff here.
  const { data } = await createServiceClient()
    .from('profiles').select('role').eq('id', user.id).single()

  const staff = isPiedroAdmin(data?.role) || isStaffViewer(data?.role)
  return staff ? ['all', 'staff'] : ['all', 'clients']
})
