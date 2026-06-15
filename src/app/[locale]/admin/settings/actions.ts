'use server'

import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { setSettings } from '@/lib/settings'

const ALLOWED = ['order_notify_email', 'admin_notify_email', 'chat_notify_email',
  'broadcast_reply_to', 'email_from', 'notify_locale',
  'dispatch_days_normal', 'dispatch_days_urgent'] as const

export async function saveSettingsAction(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const scope = await getAdminScope()
  if (!scope || !isPiedroAdmin(scope.role)) return { error: 'Not authorized' }

  const entries: Record<string, string> = {}
  for (const key of ALLOWED) entries[key] = (formData.get(key) as string ?? '').trim()
  // Notify fields accept multiple addresses — normalize separators and validate each.
  for (const key of ['order_notify_email', 'admin_notify_email', 'chat_notify_email',
    'broadcast_reply_to'] as const) {
    const list = entries[key].split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)
    const bad = list.find(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    if (bad) return { error: `Invalid email address: ${bad}` }
    entries[key] = list.join(', ')
  }
  // Checkbox: show the dispatch counter to every user (not just staff/admin).
  entries['dispatch_show_all'] = formData.get('dispatch_show_all') ? '1' : ''

  const { error } = await setSettings(entries, scope.userId)
  if (error) return { error }
  return { ok: true }
}
