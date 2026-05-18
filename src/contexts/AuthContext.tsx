'use client'

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface AuthCtx {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  isAdmin: boolean
  hasCompany: boolean
}

const Ctx = createContext<AuthCtx>({
  user: null, profile: null, loading: true,
  signOut: async () => {}, isAdmin: false, hasCompany: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const sb = createClient()
    const { data } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data as Profile | null)
  }

  useEffect(() => {
    const sb = createClient()

    sb.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) loadProfile(data.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) await loadProfile(u.id)
      else setProfile(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Mark loading done once profile resolves
  useEffect(() => {
    if (user && profile !== undefined) setLoading(false)
    else if (!user) setLoading(false)
  }, [user, profile])

  const signOut = useCallback(async () => {
    const sb = createClient()
    await sb.auth.signOut()
  }, [])

  return (
    <Ctx.Provider value={{
      user,
      profile,
      loading,
      signOut,
      isAdmin:    profile?.role === 'piedro_admin',
      hasCompany: !!profile?.company_id,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
