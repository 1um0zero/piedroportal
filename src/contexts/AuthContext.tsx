'use client'

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import { isPiedroAdmin, isBranchAdmin } from '@/lib/roles'
import type { Profile } from '@/types'

interface AuthCtx {
  profile: Profile | null
  isAdmin: boolean
  hasCompany: boolean
  isLoggedIn: boolean
  // May place orders: belongs to a company, is a Piedro admin, or a branch admin
  // ordering on behalf of the branch's clients.
  canOrder: boolean
}

const Ctx = createContext<AuthCtx>({
  profile: null, isAdmin: false, hasCompany: false, isLoggedIn: false, canOrder: false,
})

interface Props {
  children: ReactNode
  initialProfile: Profile | null
  initialLoggedIn: boolean
  initialHasCompany: boolean
}

export function AuthProvider({ children, initialProfile, initialLoggedIn, initialHasCompany }: Props) {
  // Seed from server — avoids flash of wrong state
  const [profile, setProfile]     = useState<Profile | null>(initialProfile)
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn)
  // Company membership comes from the user_companies table (not the deprecated
  // profiles.company_id) — a user can belong to several companies.
  const [hasCompany, setHasCompany] = useState(initialHasCompany)

  // Re-seed from the server when the user identity changes (e.g. after a
  // server-action login or set-password redirect re-renders the layout). useState
  // only honours the initial value on mount, so without this the client context
  // would keep a stale/null profile after a soft navigation — which, among other
  // things, suppressed the first-login welcome until a manual refresh.
  useEffect(() => {
    setProfile(initialProfile)
    setIsLoggedIn(initialLoggedIn)
    setHasCompany(initialHasCompany)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProfile?.id, initialLoggedIn, initialHasCompany])

  useEffect(() => {
    const sb = createClient()
    // Keep in sync with browser session changes (login/logout in other tabs, token refresh)
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
      if (!session?.user) {
        setProfile(null); setHasCompany(false)
        // Purge any in-progress order state on logout — it holds patient data and
        // must never carry over to the next user on a shared browser/tab.
        try {
          for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i)
            if (k && k.startsWith('order-form-state-')) sessionStorage.removeItem(k)
          }
        } catch { /* ignore */ }
        return
      }
      sb.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => setProfile(data as Profile | null))
      sb.from('user_companies').select('company_id', { count: 'exact', head: true }).eq('user_id', session.user.id)
        .then(({ count }) => setHasCompany((count ?? 0) > 0))
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Ctx.Provider value={{
      profile,
      isLoggedIn,
      isAdmin:    isPiedroAdmin(profile?.role),
      hasCompany,
      canOrder:   hasCompany || isPiedroAdmin(profile?.role) || isBranchAdmin(profile?.role),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
