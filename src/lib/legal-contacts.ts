import 'server-only'
import { getContactInfo } from '@/lib/contact-info.server'
import { LEGAL } from '@/lib/legal-info'

/**
 * Public-facing legal contact addresses, read from the back-office Contacts
 * configuration (/admin/settings/contacts). Falls back to the placeholders in
 * legal-info.ts until an admin sets them. Server-only: used by the legal, terms
 * and privacy pages. Nothing email-related is hardcoded or env-driven.
 */
export async function getLegalContacts(): Promise<{ email: string; dpoEmail: string }> {
  const info = await getContactInfo()
  return {
    email: info.email || LEGAL.email,
    dpoEmail: info.dpoEmail || LEGAL.dpoEmail,
  }
}
