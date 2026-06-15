import 'server-only'
import { getSettings } from '@/lib/settings'
import { EMPTY_CONTACT_INFO, normalizeContactInfo, type ContactInfo } from '@/lib/contact-info'

/** Read + parse the back-office Contacts configuration (app_settings.contact_info). */
export async function getContactInfo(): Promise<ContactInfo> {
  const { contact_info } = await getSettings(['contact_info'])
  if (!contact_info) return EMPTY_CONTACT_INFO
  try {
    return normalizeContactInfo(JSON.parse(contact_info))
  } catch {
    return EMPTY_CONTACT_INFO
  }
}
