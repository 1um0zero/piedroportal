'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { useGallerySection } from '@/contexts/GallerySectionContext'
import { encodeQuery } from '@/lib/query-cipher'

/**
 * "Livingston" nav entry — opens the gallery filtered to the LIV exclusive
 * collection (token match: a product may be LIV *and* other siglas). Rendered
 * only for eligible users (admin/staff or a company that owns LIV); the Navbar
 * decides `visible` server-side.
 *
 * On the gallery it sets the shared exclusive instantly; elsewhere it navigates
 * with the deep link so GalleryPage picks it up on mount.
 */
export default function HeaderLivingstonLink({ visible }: { visible: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { setExclusive } = useGallerySection()

  if (!visible) return null

  const onGallery = pathname === '/gallery' || pathname.endsWith('/gallery')

  const go = () => {
    if (onGallery) {
      setExclusive('LIV')
    } else {
      router.push({ pathname: '/gallery', query: { q: encodeQuery({ exclusive: 'LIV' }) } })
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      className="text-xs font-semibold tracking-wider text-stone-500 hover:text-stone-900 uppercase transition-colors"
    >
      Livingston
    </button>
  )
}
