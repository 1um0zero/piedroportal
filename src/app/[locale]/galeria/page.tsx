import { redirect } from 'next/navigation'
import { encodeQuery } from '@/lib/query-cipher'

/**
 * Compatibility entry point for legacy piedro.com deep links that used the old
 * Power Pages gallery URL, e.g.
 *   /galeria/?gender=979580002&category=1&search=…
 * We map the old numeric gender + category to our gallery's encoded deep link
 * and redirect, so external links land on the right section, pre-filtered.
 */
const GENDER_TO_SECTION: Record<string, string> = {
  '979580000': 'KIDS',
  '979580001': 'MEN',
  '979580002': 'WOMEN',
}

export default async function GaleriaCompat({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const get = (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v) ?? '' }

  const section = GENDER_TO_SECTION[get('gender')] ?? 'KIDS'
  const category = parseInt(get('category') || '0', 10)
  const search = get('search')

  const params: Record<string, string | number> = { section }
  if (category > 0) params.category = category
  if (search) params.search = search

  redirect(`/gallery?q=${encodeQuery(params)}`)
}
