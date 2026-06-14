'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserCompanyIds } from '@/lib/user-companies'

/** Personalisation for the first-login welcome: first name + primary company. */
export async function getWelcomeInfo(): Promise<{ name: string; company: string | null }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { name: '', company: null }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles').select('full_name').eq('id', user.id).single()

  const companyIds = await getUserCompanyIds(user.id)
  let company: string | null = null
  if (companyIds.length) {
    const { data: c } = await service
      .from('companies').select('name').eq('id', companyIds[0]).maybeSingle()
    company = c?.name ?? null
  }

  const first = (profile?.full_name ?? '').trim().split(/\s+/)[0] ?? ''
  return { name: first, company }
}

/** Mark the welcome as seen so it never shows again for this user. */
export async function dismissWelcome(): Promise<{ ok: boolean }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false }
  await createServiceClient().from('profiles').update({ seen_welcome: true }).eq('id', user.id)
  return { ok: true }
}
