'use client'

// AuthContext now only manages wishlist-sync and profile data
// Auth state is managed server-side via Supabase cookies + Server Components
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

const Ctx = createContext<AuthCtx>({ profile: null, isAdmin: false, hasCompany: false, isLoggedIn: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
      if (!data.user) return
      sb.from('profiles').select('*').eq('id', data.user.id).single()
        .then(({ data: p }) => setProfile(p as Profile | null))
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
      if (!session?.user) { setProfile(null); return }
      sb.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data: p }) => setProfile(p as Profile | null))
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Ctx.Provider value={{
      profile, isLoggedIn,
      isAdmin:    profile?.role === 'piedro_admin',
      hasCompany: !!profile?.company_id,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
