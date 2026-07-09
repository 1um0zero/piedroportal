import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host
  } catch {
    return 'ynybmsbtcmmxdabvhuny.supabase.co'
  }
})()

// Content-Security-Policy.
// 'unsafe-inline'/'unsafe-eval' are required because Next.js injects inline
// bootstrap scripts and the <model-viewer> 3D component (loaded from
// ajax.googleapis.com) uses WebGL/eval. A future hardening is a nonce-based
// strict CSP and self-hosting model-viewer. Inline styles are used throughout.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.googleapis.com https://www.gstatic.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://${supabaseHost}`,
  `font-src 'self' data:`,
  `connect-src 'self' https://${supabaseHost} https://ajax.googleapis.com https://www.gstatic.com`,
  `media-src 'self' blob: https://${supabaseHost}`,
  `worker-src 'self' blob:`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Camera is allowed for the avatar capture feature; everything else denied.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

// App version shown in the footer (so support can ask "which version?" and users
// can force a refresh after a deploy). Vercel sets VERCEL_GIT_COMMIT_SHA at build;
// fall back to a build timestamp locally.
const appVersion = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'
const buildTime = new Date().toISOString()

const nextConfig: NextConfig = {
  // sharp is a native module; keep it external so its prebuilt binary is loaded
  // at runtime instead of being bundled (bundling breaks it on Vercel — was the
  // cause of all product-image uploads failing with "fout").
  serverExternalPackages: ['sharp'],
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
  images: {
    // Keep optimized variants cached on the CDN for 31 days so the optimizer
    // rarely re-pulls the source from Supabase Storage (the effective Max-Age is
    // max(minimumCacheTTL, upstream Cache-Control)). Safe because every source
    // URL is versioned — products via ?v=PRODUCT_IMG_VERSION, catalogue leaves
    // via ?v=CATALOGUE_IMG_VERSION — so re-processed images bust the cache.
    minimumCacheTTL: 2678400, // 31 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
