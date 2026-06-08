'use client'

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'piedro_wishlist'

interface WishlistCtx {
  ids: Set<string>
  toggle: (productId: string) => void
  count: number
}

const Ctx = createContext<WishlistCtx>({ ids: new Set(), toggle: () => {}, count: 0 })

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set())

  // ── Hydrate from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setIds(new Set(JSON.parse(raw) as string[]))
    } catch {}
  }, [])

  // ── Sync with Supabase when auth state changes ─────────────────────────────
  useEffect(() => {
    const sb = createClient()
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      // Clear wishlist on logout
      if (event === 'SIGNED_OUT') {
        setIds(new Set())
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      if (!session?.user) return

      const { data } = await sb
        .from('wishlist_items')
        .select('product_id')
        .eq('user_id', session.user.id)

      if (!data) return
      const serverIds = data.map((d) => d.product_id as string)

      setIds((prev) => {
        const localIds = [...prev]
        const merged = new Set([...localIds, ...serverIds])

        // Upload local items not yet on server
        const toUpload = localIds.filter((id) => !serverIds.includes(id))
        if (toUpload.length) {
          sb.from('wishlist_items')
            .upsert(toUpload.map((product_id) => ({ user_id: session.user.id, product_id })))
            .then()
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify([...merged]))
        return merged
      })
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Toggle ─────────────────────────────────────────────────────────────────
  const toggle = useCallback((productId: string) => {
    const sb = createClient()

    setIds((prev) => {
      const next = new Set(prev)
      const removing = next.has(productId)
      if (removing) next.delete(productId); else next.add(productId)

      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))

      // Fire-and-forget Supabase sync if logged in
      sb.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        if (removing) {
          sb.from('wishlist_items')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .then()
        } else {
          sb.from('wishlist_items')
            .upsert({ user_id: user.id, product_id: productId })
            .then()
        }
      })

      return next
    })
  }, [])

  return (
    <Ctx.Provider value={{ ids, toggle, count: ids.size }}>
      {children}
    </Ctx.Provider>
  )
}

export const useWishlist = () => useContext(Ctx)
