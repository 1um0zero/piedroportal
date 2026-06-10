import { redirect } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/landing/LandingPage'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function LocalePage({ params }: Props) {
  const { locale } = await params
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`

  // Signed-in users skip the marketing landing and go straight to the catalogue.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(`${prefix}/gallery`)

  return <LandingPage />
}
