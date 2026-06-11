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
  const { exclusive, setExclusive } = useGallerySection()

  if (!visible) return null

  const onGallery = pathname === '/gallery' || pathname.endsWith('/gallery')
  const active = onGallery && exclusive === 'LIV'

  // On the gallery it toggles the LIV collection (highlighted while active);
  // elsewhere it navigates with the deep link.
  const go = () => {
    if (onGallery) setExclusive(active ? '' : 'LIV')
    else router.push({ pathname: '/gallery', query: { q: encodeQuery({ exclusive: 'LIV' }) } })
  }

  // Reuses the section-switch styling so it follows the header (white over the
  // photo, dark grey on the solid bar) and shows a clear active state.
  return (
    <button
      type="button"
      onClick={go}
      aria-pressed={active}
      className={`section-switch-btn px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors
        ${active ? 'is-active' : ''}`}
    >
      Livingston
    </button>
  )
}
