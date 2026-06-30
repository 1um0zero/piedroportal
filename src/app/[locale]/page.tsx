import { createClient } from '@/lib/supabase/server'
import LandingPageNew from '@/components/landing/LandingPageNew'
import AnnouncementsHost from '@/components/announcements/AnnouncementsHost'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function LocalePage({ params, searchParams }: Props) {
  await params
  const { error } = await searchParams

  // Signed-in users see the homepage too (no forced redirect to the gallery) —
  // navigation is never forced; only actions that require login gate on it.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // The revised homepage (formerly /homenew) is now the live entry point.
  // The previous landing is kept at /homebk for validation.
  return (
    <>
      <AnnouncementsHost placement="homepage" />
      <LandingPageNew hasError={error === '1'} loggedIn={!!user} />
    </>
  )
}
