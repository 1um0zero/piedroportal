import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notifyAdminNewUser } from '@/lib/notify-new-user'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/gallery'

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const user = data.user
      const createdAt = new Date(user.created_at).getTime()
      const isNewUser = Date.now() - createdAt < 10 * 60 * 1000  // confirmed within 10 min of creation

      if (isNewUser) {
        const fullName = (user.user_metadata?.full_name as string) ?? ''
        notifyAdminNewUser(user.email ?? '', fullName)  // fire-and-forget
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
