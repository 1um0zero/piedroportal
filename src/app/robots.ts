import type { MetadataRoute } from 'next'

// Private B2B medical portal — must not be indexed by search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  }
}
