import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { routing } from './i18n/routing'

const handleI18n = createMiddleware(routing)

// Routes requiring authentication (locale-relative)
const AUTH_REQUIRED = ['/orders', '/orders/dashboard', '/wishlist', '/admin', '/set-password']

// next.js 16: file should be proxy.ts, but Turbopack 16.2.6 only watches src/
// eagerly and doesn't invoke proxy.ts at runtime — using src/middleware.ts instead.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/|auth/|share/|.*\\..*).*)',],
}
