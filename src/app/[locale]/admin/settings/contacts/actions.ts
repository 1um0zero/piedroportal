'use server'

import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { setSettings } from '@/lib/settings'
import { normalizeContactInfo, type ContactInfo } from '@/lib/contact-info'

const emailOk = (e: string) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export async function saveContactsAction(data: ContactInfo): Promise<{ ok?: boolean; error?: string }> {
  const scope = await getAdminScope()
  if (!scope || !isPiedroAdmin(scope.role)) return { error: 'Not authorized' }

  const info = normalizeContactInfo(data)
  if (!emailOk(info.email)) return { error: `Invalid contact email: ${info.email}` }
  if (!emailOk(info.dpoEmail)) return { error: `Invalid data-protection email: ${info.dpoEmail}` }
  for (const l of info.locations) {
    if (!emailOk(l.email)) return { error: `Invalid email for "${l.label || l.type}": ${l.email}` }
  }
  // Drop fully-empty locations so they don't clutter the footer.
  info.locations = info.locations.filter(l => l.label || l.address || l.phone || l.email)

  const { error } = await setSettings({ contact_info: JSON.stringify(info) }, scope.userId)
  if (error) return { error }
  return { ok: true }
}
