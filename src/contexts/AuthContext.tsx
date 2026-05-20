'use client'

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface AuthCtx {
  profile: Profile | null
  isAdmin: boolean
  hasCompany: boolean
  isLoggedIn: boolean
}

const Ctx = createContext<AuthCtx>({
  profile: null, isAdmin: false, hasCompany: false, isLoggedIn: false,
})

interface Props {
  children: ReactNode
  initialProfile: Profile | null
  initialLoggedIn: boolean
}

export function AuthProvider({ children, initialProfile, initialLoggedIn }: Props) {
  // Seed from server — avoids flash of wrong state
  const [profile, setProfile]     = useState<Profile | null>(initialProfile)
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn)

  useEffect(() => {
    const sb = createClient()
    // Keep in sync with browser session changes (login/logout in other tabs, token refresh)
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
      if (!session?.user) { setProfile(null); return }
      sb.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }) => setProfile(data as Profile | null))
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Ctx.Provider value={{
      profile,
      isLoggedIn,
      isAdmin:    profile?.role === 'piedro_admin',
      hasCompany: !!profile?.company_id,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
