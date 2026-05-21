'use server'

import { createClient } from '@/lib/supabase/server'

export async function setLocaleAction(locale: string) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  await sb.from('profiles').update({ preferred_locale: locale }).eq('id', user.id)
}
