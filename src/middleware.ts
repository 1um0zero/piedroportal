import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { routing } from './i18n/routing'

const handleI18n = createMiddleware(routing)

// Routes requiring authentication (locale-relative)
const AUTH_REQUIRED = ['/orders', '/orders/dashboard', '/wishlist', '/admin']

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

  const needsAuth =
    AUTH_REQUIRED.some((r) => withoutLocale === r || withoutLocale.startsWith(r + '/')) ||
    withoutLocale.endsWith('/order')  // e.g. /gallery/[id]/order

  if (needsAuth) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const loginUrl = new URL(request.url)
      loginUrl.pathname = pathname.replace(withoutLocale, '/login')
      return NextResponse.redirect(loginUrl)
    }
  }

  return handleI18n(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/|auth/).*)',],
}
