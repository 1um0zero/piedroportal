import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { routing } from './i18n/routing'
import { encodeQuery } from './lib/query-cipher'

const handleI18n = createMiddleware(routing)

// Legacy piedro.com catalogue deep links used the old Power Pages gallery at
// `…/galeria/?gender=979580002&category=1&search=…` (often with an `/en-US/`
// prefix our routing doesn't know). Catch any `…/galeria` path, translate the
// numeric gender + category to our encoded gallery deep link, and redirect.
const GENDER_TO_SECTION: Record<string, string> = {
  '979580000': 'KIDS', '979580001': 'MEN', '979580002': 'WOMEN',
}
function legacyGaleriaRedirect(request: NextRequest): NextResponse | null {
  const segs = request.nextUrl.pathname.replace(/\/+$/, '').split('/')
  if (segs[segs.length - 1].toLowerCase() !== 'galeria') return null
  const sp = request.nextUrl.searchParams
  const params: Record<string, string | number> = {
    section: GENDER_TO_SECTION[sp.get('gender') ?? ''] ?? 'KIDS',
  }
  const category = parseInt(sp.get('category') ?? '0', 10)
  if (category > 0) params.category = category
  const search = sp.get('search')
  if (search) params.search = search
  const diabetics = (sp.get('diabetics') ?? '').toLowerCase()
  if (diabetics && !['0', 'false', ''].includes(diabetics)) params.diabetics = 1
  // Preserve the legacy locale prefix (e.g. `/nl-NL/galeria` → Dutch gallery).
  // `as-needed` means the default locale (en) stays prefix-free.
  const lang = (segs.find((s) => /^[a-z]{2}-[a-z]{2}$/i.test(s)) ?? '').slice(0, 2).toLowerCase()
  const localized = routing.locales.includes(lang as (typeof routing.locales)[number]) && lang !== routing.defaultLocale
  const dest = new URL(localized ? `/${lang}/gallery` : '/gallery', request.url)
  dest.searchParams.set('q', encodeQuery(params))
  return NextResponse.redirect(dest)
}

// Legacy Power Pages locale codes were region-tagged (`nl-NL`, `en-US`, …) and
// some pages had different slugs than ours. The old-portal forwarder preserves
// the full incoming path, so a link like `…/nl-NL/Pair-by-Pair/` reaches us with
// a locale prefix our `as-needed` routing doesn't recognise (→ no translation)
// and an old slug that doesn't resolve. Normalise the region-tagged locale to
// our bare locale and remap known legacy slugs.
const LEGACY_LOCALE_RE = /^[a-z]{2}-[a-z]{2}$/i
// Old Power Pages page slug (lower-cased, no locale, no trailing slash) → new
// locale-relative path. `Pair-by-Pair` was the catalogue page = our gallery.
const LEGACY_PATHS: Record<string, string> = {
  'pair-by-pair': '/gallery',
}
function legacyLocaleRedirect(request: NextRequest): NextResponse | null {
  const segs = request.nextUrl.pathname.split('/').filter(Boolean)
  if (segs.length === 0 || !LEGACY_LOCALE_RE.test(segs[0])) return null

  const lang = segs[0].slice(0, 2).toLowerCase()
  const isLocale = routing.locales.includes(lang as (typeof routing.locales)[number])
  const prefix = isLocale && lang !== routing.defaultLocale ? `/${lang}` : ''

  const restSlug = segs.slice(1).join('/').replace(/\/+$/, '').toLowerCase()
  const restPath = LEGACY_PATHS[restSlug] ?? (segs.length > 1 ? `/${segs.slice(1).join('/')}` : '/gallery')

  const dest = new URL(`${prefix}${restPath === '/' ? '' : restPath}` || '/', request.url)
  dest.search = request.nextUrl.search
  return NextResponse.redirect(dest)
}

// Routes requiring authentication (locale-relative)
// /wishlist is a client-side (localStorage) browse list — viewable without login;
// ordering from it still gates on login + eligibility in the order flow.
// /stock is public like the gallery — browsing/selecting needs no login;
// placing the order gates on login + eligibility in the page itself.
const AUTH_REQUIRED = ['/orders', '/orders/dashboard', '/admin', '/set-password']

// next.js 16: file should be proxy.ts, but Turbopack 16.2.6 only watches src/
// eagerly and doesn't invoke proxy.ts at runtime — using src/middleware.ts instead.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Legacy /galeria deep links (piedro.com) → our encoded gallery URL.
  const galeria = legacyGaleriaRedirect(request)
  if (galeria) return galeria

  // Other legacy Power Pages deep links (region-tagged locale + old slug).
  const legacy = legacyLocaleRedirect(request)
  if (legacy) return legacy

  // Strip locale prefix to get the locale-relative path
  const locales = routing.locales.map((l) => `/${l}`)
  const withoutLocale = locales.reduce(
    (p, loc) => (p.startsWith(loc + '/') || p === loc ? p.slice(loc.length) || '/' : p),
    pathname,
  )

  // Token-based password reset is reachable without a session (the user isn't
  // logged in yet); the token is validated server-side when submitted.
  const isTokenReset = withoutLocale === '/set-password' && request.nextUrl.searchParams.has('token')

  const needsAuth =
    !isTokenReset && (
      AUTH_REQUIRED.some((r) => withoutLocale === r || withoutLocale.startsWith(r + '/')) ||
      withoutLocale.endsWith('/order')  // e.g. /gallery/[id]/order
    )

  if (needsAuth) {
    const response = handleI18n(request)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookies) => {
            cookies.forEach((cookie) => {
              request.cookies.set(cookie)
              response.cookies.set(cookie)
            })
          },
        },
      },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const loginUrl = new URL(request.url)
      loginUrl.pathname = pathname.replace(withoutLocale, '/login')
      return NextResponse.redirect(loginUrl)
    }

    // Migrated users (no invite email) must set their own password before using
    // any protected area. Don't redirect the set-password page onto itself.
    if (withoutLocale !== '/set-password') {
      const { data: prof } = await supabase
        .from('profiles').select('must_set_password').eq('id', user.id).single()
      if (prof?.must_set_password) {
        const setPwUrl = new URL(request.url)
        setPwUrl.pathname = pathname.replace(withoutLocale, '/set-password')
        setPwUrl.search = ''
        return NextResponse.redirect(setPwUrl)
      }
    }

    return response
  }

  return handleI18n(request)
}

export const config = {
  // `.*\\..*` excludes any path with a file extension (e.g. /rocker/normal.png,
  // /piedro-logo.png) so public static assets are served directly, not routed by i18n.
  // Only the PKCE callback route lives outside [locale]; /auth/confirm is a
  // localized page and must go through the i18n middleware.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/|auth/callback|share/|.*\\..*).*)',],
}
