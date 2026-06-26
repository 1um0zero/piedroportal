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
 * Lists whose search/filter/sort state lives in local component state (rather than
 * the URL) can also have that restored on the way back: pass an `onRestore` callback
 * and hand the current filter snapshot to `rememberReturn(snapshot)`. The snapshot is
 * stored alongside page+scroll and replayed once on return.
 *
 *   const nav = useListNav('admin-products', s => { setQ(s.q); setSort(s.sort) })
 *   onClick={() => nav.rememberReturn({ q, sort })}
 *
 * The saved position is consumed once (cleared after the first restore) so a fresh
 * later visit to the list still starts clean.
 */
export function useListNav<S = unknown>(listKey: string, onRestore?: (state: S) => void) {
  const KEY = `listnav:${listKey}`
  const [page, setPageState] = useState(1)
  // Live mirror of `page` so rememberReturn() never captures a stale closure value.
  const pageRef = useRef(1)
  useLayoutEffect(() => { pageRef.current = page }, [page])
  // Keep onRestore in a ref so the restore effect stays a once-on-mount run
  // regardless of the caller passing a fresh closure each render.
  const onRestoreRef = useRef(onRestore)
  useLayoutEffect(() => { onRestoreRef.current = onRestore }, [onRestore])

  // Restore on mount (post-hydration to avoid an SSR/client mismatch), once.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (!raw) return
      sessionStorage.removeItem(KEY)
      const { page: p, scrollY, state } = JSON.parse(raw) as { page?: number; scrollY?: number; state?: S }
      // Replay filters/search/sort first so the restored page indexes the right slice.
      if (state !== undefined && onRestoreRef.current) onRestoreRef.current(state)
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

  /** Call right before navigating into a row's detail page. Pass a filter
   *  snapshot to have it restored on return (paired with `onRestore`). */
  const rememberReturn = useCallback((state?: S) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ page: pageRef.current, scrollY: window.scrollY, state }))
    } catch { /* ignore */ }
  }, [KEY])

  return { page, setPage, rememberReturn }
}
