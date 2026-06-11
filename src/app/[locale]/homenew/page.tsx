import { redirect } from '@/i18n/navigation'
import { getLocale } from 'next-intl/server'

// The revised landing was promoted to the live homepage at `/`. Keep the old
// /homenew URL working by redirecting it there (locale-aware).
export default async function HomeNewRoute() {
  const locale = await getLocale()
  redirect({ href: '/', locale })
}
