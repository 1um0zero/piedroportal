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
  // Returned (not redirected) so the card — page or floating modal — shows the
  // error in place without yanking the user anywhere.
  if (error) return { error: true }

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

  // The floating login modal passes the page it sits on so the user stays put.
  // Same-origin paths only (no protocol-relative `//host` open redirects).
  const redirectTo = formData.get('redirect_to') as string | null
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) redirect(redirectTo)

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
