import { redirect } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import LandingPageNew from '@/components/landing/LandingPageNew'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function LocalePage({ params, searchParams }: Props) {
  const { locale } = await params
  const { error } = await searchParams
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`

  // Signed-in users skip the marketing landing and go straight to the catalogue.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(`${prefix}/gallery`)

  // The revised homepage (formerly /homenew) is now the live entry point.
  // The previous landing is kept at /homebk for validation.
  return <LandingPageNew hasError={error === '1'} />
}
