/**
 * Company contact information — the single back-office source of truth for
 * public contact details. Stored as JSON in app_settings under `contact_info`
 * (no env vars, nothing hardcoded). Consumed by the footer (social + locations),
 * the chat assistant (public email) and the legal/privacy pages (email + DPO).
 *
 * This module is pure (client-safe): types, constants and the JSON normalizer.
 * The server-side reader lives in `contact-info.server.ts`.
 *
 * Edit at /admin/settings/contacts.
 */

export const LOCATION_TYPES = ['office', 'factory', 'warehouse', 'showroom', 'other'] as const
export type LocationType = (typeof LOCATION_TYPES)[number]

export type ContactLocation = {
  type: LocationType
  label: string
  address: string
  phone: string
  email: string
}

export type ContactSocial = {
  facebook: string
  instagram: string
  linkedin: string
  x: string
}

export type ContactInfo = {
  email: string      // public contact address (chat + legal pages)
  dpoEmail: string   // data-protection contact (privacy + legal pages)
  social: ContactSocial
  locations: ContactLocation[]
}

export const EMPTY_CONTACT_INFO: ContactInfo = {
  email: '',
  dpoEmail: '',
  social: { facebook: '', instagram: '', linkedin: '', x: '' },
  locations: [],
}

/** Coerce arbitrary parsed JSON into a well-formed ContactInfo. */
export function normalizeContactInfo(raw: unknown): ContactInfo {
  const o = (raw ?? {}) as Record<string, unknown>
  const s = (o.social ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const locations = Array.isArray(o.locations)
    ? o.locations.map((l) => {
        const x = (l ?? {}) as Record<string, unknown>
        const type = LOCATION_TYPES.includes(x.type as LocationType) ? (x.type as LocationType) : 'office'
        return { type, label: str(x.label), address: str(x.address), phone: str(x.phone), email: str(x.email) }
      })
    : []
  return {
    email: str(o.email),
    dpoEmail: str(o.dpoEmail),
    social: { facebook: str(s.facebook), instagram: str(s.instagram), linkedin: str(s.linkedin), x: str(s.x) },
    locations,
  }
}
