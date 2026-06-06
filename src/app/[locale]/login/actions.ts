'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function signInAction(_: unknown, formData: FormData) {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    },
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect('/login?error=1')

  // Redirect to the user's preferred locale
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_locale, must_set_password')
    .eq('id', data.user.id)
    .single()

  const loc = profile?.preferred_locale ?? 'en'
  const prefix = loc === 'en' ? '' : `/${loc}`

  // Migrated users (no invite email) must set their own password first.
  if (profile?.must_set_password) redirect(`${prefix}/set-password`)

  redirect(`${prefix}/gallery`)
}

export async function signOutAction() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    },
  )
  await supabase.auth.signOut()
  redirect('/login')
}
