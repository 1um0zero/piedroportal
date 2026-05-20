import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/ui/Navbar'
import { WishlistProvider } from '@/contexts/WishlistContext'
import { AuthProvider } from '@/contexts/AuthContext'
import type { Profile } from '@/types'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  const messages = await getMessages()

  // Fetch auth state server-side so client gets correct initial values
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data as Profile | null
  }

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <AuthProvider initialProfile={profile} initialLoggedIn={!!user}>
        <WishlistProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar locale={locale} />
            <div className="flex-1">{children}</div>
          </div>
        </WishlistProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  )
}
