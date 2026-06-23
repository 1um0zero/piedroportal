import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

/**
 * Admin "act-as" (impersonation) — server-side helpers.
 *
 * The feature lets a Piedro/super admin step into another user's REAL Supabase
 * session to confirm the portal behaves according to that user's permissions
 * (true impersonation, not an emulated view). Two httpOnly cookies hold the
 * state; both are HMAC-signed so a logged-in user can never forge them to spoof
 * the audit attribution or restore a session that isn't theirs:
 *
 *   pp_imp        — the active impersonation marker (who is acting as whom).
 *                   Read on every request to render the banner, suppress the
 *                   welcome modal, and attribute audited mutations to the real
 *                   admin acting on behalf of the target.
 *   pp_imp_origin — the admin's ORIGINAL session tokens, so "Back to my account"
 *                   restores their session without a fresh login.
 *
 * The Supabase auth cookies themselves are swapped to the target's real session
 * by the start action — that is what makes RLS, role and company scoping run
 * through the genuine code paths.
 */

export const IMP_COOKIE = 'pp_imp'
export const IMP_ORIGIN_COOKIE = 'pp_imp_origin'

export interface ImpersonationState {
  adminId:     string
  adminName:   string
  targetId:    string
  targetName:  string
  targetEmail: string
}

export interface OriginSession {
  access_token:  string
  refresh_token: string
}

// The service-role key is server-only and always present — a convenient secret
// to bind these signatures to this deployment. Never leaves the server.
function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || 'piedro-impersonation-fallback'
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Sign an arbitrary JSON payload as `<base64url(json)>.<base64url(hmac)>`. */
export function signImpersonation(payload: unknown): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const mac = b64url(createHmac('sha256', secret()).update(body).digest())
  return `${body}.${mac}`
}

/** Verify + parse a signed payload; returns null on any tampering/format error. */
export function verifyImpersonation<T>(raw: string | undefined | null): T | null {
  if (!raw || !raw.includes('.')) return null
  const [body, mac] = raw.split('.')
  if (!body || !mac) return null
  const expected = b64url(createHmac('sha256', secret()).update(body).digest())
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const json = Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

/**
 * Current impersonation state for this request, or null if the caller is not
 * acting as anyone. Read-only (uses the request cookie store); mutations live in
 * the start/stop server actions.
 */
export async function getImpersonation(): Promise<ImpersonationState | null> {
  const store = await cookies()
  return verifyImpersonation<ImpersonationState>(store.get(IMP_COOKIE)?.value)
}
