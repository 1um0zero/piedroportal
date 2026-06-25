'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Shared list-navigation state for every paginated list/grid in the portal.
 *
 * - Owns the current `page` (1-indexed).
 * - Remembers where the user was — page + scroll position — when they open a row's
 *   detail page, and restores it on the way back, so returning from an order/product
 *   doesn't dump them at the top of page 1.
 *
 * Usage:
 *   const { page, setPage, rememberReturn } = useListNav('orders')
 *   // on a row click that navigates to a detail page:
 *   onClick={() => { rememberReturn(); router.push(href) }}
 *
 * The saved position is consumed once (cleared after the first restore) so a fresh
 * later visit to the list still starts clean.
 */
export function useListNav(listKey: string) {
  const KEY = `listnav:${listKey}`
  const [page, setPageState] = useState(1)
  // Live mirror of `page` so rememberReturn() never captures a stale closure value.
  const pageRef = useRef(1)
  useLayoutEffect(() => { pageRef.current = page }, [page])

  // Restore on mount (post-hydration to avoid an SSR/client mismatch), once.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (!raw) return
      sessionStorage.removeItem(KEY)
      const { page: p, scrollY } = JSON.parse(raw) as { page?: number; scrollY?: number }
      if (p && p > 1) setPageState(p)
      if (typeof scrollY === 'number') {
        // Two rAFs: let the restored page slice render before scrolling to it.
        requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollY)))
      }
    } catch { /* sessionStorage unavailable — ignore */ }
  }, [KEY])

  const setPage = useCallback((upd: number | ((prev: number) => number)) => {
    setPageState(prev => (typeof upd === 'function' ? upd(prev) : upd))
  }, [])

  /** Call right before navigating into a row's detail page. */
  const rememberReturn = useCallback(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ page: pageRef.current, scrollY: window.scrollY }))
    } catch { /* ignore */ }
  }, [KEY])

  return { page, setPage, rememberReturn }
}
