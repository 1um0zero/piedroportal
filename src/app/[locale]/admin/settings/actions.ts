'use server'

import { getAdminScope } from '@/lib/admin/scope'
import { setSettings } from '@/lib/settings'

const ALLOWED = ['order_notify_email', 'admin_notify_email', 'email_from', 'notify_locale'] as const

export async function saveSettingsAction(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const scope = await getAdminScope()
  if (!scope || scope.role !== 'piedro_admin') return { error: 'Not authorized' }

  const entries: Record<string, string> = {}
  for (const key of ALLOWED) entries[key] = (formData.get(key) as string ?? '').trim()

  const { error } = await setSettings(entries, scope.userId)
  if (error) return { error }
  return { ok: true }
}
