'use server'

import { getLocale } from 'next-intl/server'
import { requestPasswordReset } from '@/lib/password-reset'

/**
 * Sends our own password-reset / first-time-set-password email (see
 * src/lib/password-reset.ts). Migrated Power Pages users use this on first login.
 * Always reports success — never reveals whether an address is registered.
 */
export async function requestPasswordResetAction(
  _: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const email = (formData.get('email') as string ?? '').trim()
  if (!email) return { error: 'missing_email' }

  const locale = await getLocale()
  await requestPasswordReset(email, locale)
  return { ok: true }
}
