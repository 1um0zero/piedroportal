/**
 * Opaque (but STABLE) query-string encoding.
 *
 * Goal: keep internal vocabulary out of URLs so they don't invite tampering —
 * `?section=WOMEN` becomes `?q=<token>`. This is obfuscation, NOT security:
 * real authorization lives server-side (RLS, middleware auth guard). The token
 * is deterministic, so shared links and bookmarks keep working indefinitely.
 *
 * Usage:
 *   <Link href={{ pathname: '/gallery', query: { q: encodeQuery({ section: 'WOMEN' }) } }} />
 *   const { section } = decodeQuery(searchParams.get('q'))
 *
 * Isomorphic: works in Server Components, Server Actions and the browser.
 */

// Fixed obfuscation key — deliberately NOT a secret. Changing it invalidates
// any links already in the wild, so treat it as a stable constant.
const KEY = 'pdr-q9'

function xorString(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    out += String.fromCharCode(s.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length))
  }
  return out
}

function toBase64Url(s: string): string {
  const b64 = typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s, 'binary').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  return typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
}

export function encodeQuery(params: Record<string, string | number>): string {
  // encodeURIComponent first → guarantees an ASCII payload (XOR + base64 safe
  // even if a value ever contains accents/unicode).
  const raw = encodeURIComponent(JSON.stringify(params))
  return toBase64Url(xorString(raw))
}

export function decodeQuery(token: string | null | undefined): Record<string, string> {
  if (!token) return {}
  try {
    const raw = decodeURIComponent(xorString(fromBase64Url(token)))
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? obj : {}
  } catch {
    return {}
  }
}
