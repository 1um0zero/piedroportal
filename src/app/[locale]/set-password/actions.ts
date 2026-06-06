'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { consumePasswordReset } from '@/lib/password-reset'

/**
 * Sets a user's password. Two modes:
 *  • token mode (not logged in): from the reset email link — validated + single-use.
 *  • session mode (logged in): the must_set_password first-login flow.
 */
export async function setPasswordAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; viaToken?: boolean }> {
  const password = formData.get('password') as string
  const confirm  = formData.get('confirm') as string
  const token    = (formData.get('token') as string) || ''

  if (!password || password.length < 8) return { error: 'too_short' }
  if (password !== confirm)             return { error: 'mismatch' }

  // Token mode — no session required.
  if (token) {
    const res = await consumePasswordReset(token, password)
    if (res.error) return { error: res.error === 'too_short' ? 'too_short' : 'invalid_token' }
    return { ok: true, viaToken: true }
  }

  // Session mode — first-login forced reset for the logged-in user.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const { error: pwErr } = await supabase.auth.updateUser({ password })
  if (pwErr) return { error: pwErr.message }

  const service = createServiceClient()
  const { error: flagErr } = await service
    .from('profiles').update({ must_set_password: false }).eq('id', user.id)
  if (flagErr) return { error: flagErr.message }

  return { ok: true }
}
