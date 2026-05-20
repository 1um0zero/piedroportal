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

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect('/login?error=1')
  redirect('/gallery')
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
