'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'

/**
 * The "Gallery" nav link — hidden on /gallery itself, where the KIDS/MEN/WOMEN
 * section switch already lives in the header (so the link would be redundant).
 */
export default function NavGalleryLink() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const onGallery = pathname === '/gallery' || pathname.endsWith('/gallery')
  if (onGallery) return null

  return (
    <Link href="/gallery" className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors">
      {t('gallery')}
    </Link>
  )
}
