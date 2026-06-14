'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'

/**
 * First-party navigation beacon. Fires once per pathname change (logged-in or
 * anonymous) to /api/track. Uses sendBeacon so it never blocks navigation and
 * survives page unload; falls back to keepalive fetch.
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const locale = useLocale()
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname === last.current) return
    last.current = pathname

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || undefined,
      locale: locale || undefined,
    })

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'text/plain' }))
      } else {
        void fetch('/api/track', { method: 'POST', body: payload, keepalive: true })
      }
    } catch {
      /* analytics must never affect the user */
    }
  }, [pathname, locale])

  return null
}
