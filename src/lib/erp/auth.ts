import { timingSafeEqual } from 'crypto'

/**
 * Bearer-token auth for the ERP (a-shell) integration endpoints.
 * The ERP sends `Authorization: Bearer <ERP_API_TOKEN>`.
 * Returns true only on a constant-time match.
 */
export function isErpAuthorized(req: Request): boolean {
  const expected = process.env.ERP_API_TOKEN
  if (!expected) return false // fail closed if not configured

  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return false

  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
