import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import {
  type Announcement,
  type AnnouncementPlacement,
  type LiveAnnouncement,
  localiseAnnouncement,
} from '@/lib/announcements-types'

/**
 * Announcements data layer (service-role; RLS has no policies — see migration
 * 046). Read by the public display host and the admin composer.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): Announcement {
  return {
    id: r.id,
    title: r.title,
    sourceLocale: r.source_locale,
    bodyHtml: r.body_html,
    translations: r.translations ?? null,
    displayType: r.display_type,
    placement: (r.placement ?? []) as AnnouncementPlacement[],
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    active: r.active,
    dismissible: r.dismissible,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

const SELECT =
  'id, title, source_locale, body_html, translations, display_type, placement, starts_at, ends_at, active, dismissible, created_at, updated_at'

/**
 * Live announcements for a placement, already localised for the viewer. Filters
 * to active rows whose [starts_at, ends_at] window contains "now" — that window
 * is the rule that decides when a message appears and disappears.
 */
export async function getLiveAnnouncements(
  placement: AnnouncementPlacement,
  locale: string,
): Promise<LiveAnnouncement[]> {
  const nowIso = new Date().toISOString()
  const service = createServiceClient()
  const { data, error } = await service
    .from('announcements')
    .select(SELECT)
    .eq('active', true)
    .contains('placement', [placement])
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('created_at', { ascending: false })
  if (error || !data) return []

  return data.map(mapRow).map(a => {
    const { title, bodyHtml } = localiseAnnouncement(a, locale)
    return {
      id: a.id,
      displayType: a.displayType,
      dismissible: a.dismissible,
      title,
      bodyHtml,
      version: a.updatedAt,
    }
  })
}

/** All announcements for the admin list (newest first). */
export async function listAnnouncements(): Promise<Announcement[]> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('announcements')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error || !data) return []
  return data.map(mapRow)
}
