'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin } from '@/lib/roles'
import { logAdminAction } from '@/lib/admin/audit'
import {
  IMP_COOKIE, IMP_ORIGIN_COOKIE,
  signImpersonation, verifyImpersonation, getImpersonation,
  type OriginSession,
} from '@/lib/impersonation'

const COOKIE_OPTS = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' }

/**
 * Begin acting as another user (true impersonation). Only Piedro/super admins
 * may do this, never against another admin or themselves. We mint the target's
 * REAL Supabase session via a service-role magic-link token (no email sent),
 * stash the admin's own session so it can be restored, and drop a signed marker
 * used for the banner and on-behalf audit attribution.
 */
export async function startImpersonation(
  targetUserId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Refuse if already impersonating — stop first, then start a new one.
  if (await getImpersonation()) return { error: 'Already impersonating — return to your account first' }

  const { data: me } = await sb
    .from('profiles').select('role, full_name, email').eq('id', user.id).single()
  if (!isPiedroAdmin(me?.role)) return { error: 'Not allowed' }
  if (targetUserId === user.id) return { error: 'Cannot impersonate yourself' }

  const service = createServiceClient()
  const { data: target } = await service
    .from('profiles').select('id, role, full_name, email').eq('id', targetUserId).single()
  if (!target) return { error: 'User not found' }
  // Act-as is for validating CLIENT permissions; stepping into an equal/higher
  // privilege adds risk with no benefit.
  if (isPiedroAdmin(target.role)) return { error: 'Cannot impersonate another administrator' }
  if (!target.email) return { error: 'User has no email to sign in as' }

  // Preserve the admin's real session so "Back to my account" restores it
  // without a fresh login.
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return { error: 'No active session' }

  // Mint the target's real session: a magic-link token generated with the
  // service role, then verified to set the Supabase auth cookies. No email sent.
  const { data: link, error: linkErr } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: target.email,
  })
  const hashed = link?.properties?.hashed_token
  if (linkErr || !hashed) return { error: linkErr?.message ?? 'Could not start session' }

  const { error: vErr } = await sb.auth.verifyOtp({ type: 'magiclink', token_hash: hashed })
  if (vErr) return { error: vErr.message }

  const store = await cookies()
  store.set(IMP_ORIGIN_COOKIE, signImpersonation({
    access_token:  session.access_token,
    refresh_token: session.refresh_token,
  } satisfies OriginSession), COOKIE_OPTS)
  store.set(IMP_COOKIE, signImpersonation({
    adminId:     user.id,
    adminName:   me?.full_name || me?.email || 'Admin',
    targetId:    target.id,
    targetName:  target.full_name || target.email,
    targetEmail: target.email,
  }), COOKIE_OPTS)

  await logAdminAction({
    actorId: user.id, actorRole: me?.role,
    action: 'impersonation_start',
    impersonatedAsUserId: target.id,
    details: { target_email: target.email, target_name: target.full_name },
  })
  return { ok: true }
}

/**
 * Stop acting as another user and restore the admin's own session. Safe to call
 * even if not impersonating (no-op).
 */
export async function stopImpersonation(): Promise<{ ok?: boolean; error?: string }> {
  const store = await cookies()
  const imp = await getImpersonation()
  const origin = verifyImpersonation<OriginSession>(store.get(IMP_ORIGIN_COOKIE)?.value)

  if (origin) {
    const sb = await createClient()
    // setSession accepts the (possibly expired) access token and silently
    // refreshes via the refresh token — restoring the admin's real session.
    await sb.auth.setSession({
      access_token:  origin.access_token,
      refresh_token: origin.refresh_token,
    })
  }

  store.delete(IMP_COOKIE)
  store.delete(IMP_ORIGIN_COOKIE)

  if (imp) {
    await logAdminAction({
      actorId: imp.adminId,
      action: 'impersonation_stop',
      impersonatedAsUserId: imp.targetId,
    })
  }
  return { ok: true }
}
