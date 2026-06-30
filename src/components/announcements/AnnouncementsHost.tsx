import { getLocale } from 'next-intl/server'
import { getLiveAnnouncements } from '@/lib/announcements'
import type { AnnouncementPlacement } from '@/lib/announcements-types'
import AnnouncementBoard from './AnnouncementBoard'

/**
 * Server entry point: fetch the live announcements for a placement (localised
 * for the current request) and hand them to the client board. Renders nothing
 * when there is nothing live — cheap to mount anywhere.
 */
export default async function AnnouncementsHost({ placement }: { placement: AnnouncementPlacement }) {
  const locale = await getLocale()
  const items = await getLiveAnnouncements(placement, locale)
  if (!items.length) return null
  return <AnnouncementBoard items={items} />
}
