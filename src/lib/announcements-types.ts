// Shared announcement types — pure module (no 'server-only'), safe to import
// from client components and the admin composer alike.

export type AnnouncementDisplay = 'popup' | 'chip' | 'banner'
export type AnnouncementPlacement = 'after_login' | 'homepage' | 'order_start'

export const ANNOUNCEMENT_DISPLAYS: AnnouncementDisplay[] = ['popup', 'chip', 'banner']
export const ANNOUNCEMENT_PLACEMENTS: AnnouncementPlacement[] = ['after_login', 'homepage', 'order_start']
export const ANNOUNCEMENT_LOCALES = ['en', 'nl', 'fr', 'de'] as const

/** A per-locale variant of the message. The source-locale copy lives on the row itself. */
export interface AnnouncementVariant {
  title?: string
  bodyHtml: string
}

/** Full row as stored / edited in the admin. */
export interface Announcement {
  id: string
  title: string
  sourceLocale: string
  bodyHtml: string
  translations: Record<string, AnnouncementVariant> | null
  displayType: AnnouncementDisplay
  placement: AnnouncementPlacement[]
  startsAt: string | null
  endsAt: string | null
  active: boolean
  dismissible: boolean
  createdAt: string
  updatedAt: string
}

/** What the public display components actually need (title/body already localised). */
export interface LiveAnnouncement {
  id: string
  displayType: AnnouncementDisplay
  dismissible: boolean
  title: string
  bodyHtml: string
  /** Bumped whenever the message changes — used to re-show a session-dismissed item. */
  version: string
}

/** Pick the best title/body for a viewer locale, falling back to the source copy. */
export function localiseAnnouncement(
  a: Pick<Announcement, 'title' | 'bodyHtml' | 'sourceLocale' | 'translations'>,
  locale: string,
): { title: string; bodyHtml: string } {
  if (locale !== a.sourceLocale) {
    const v = a.translations?.[locale]
    if (v?.bodyHtml?.trim()) return { title: v.title?.trim() || a.title, bodyHtml: v.bodyHtml }
  }
  return { title: a.title, bodyHtml: a.bodyHtml }
}
