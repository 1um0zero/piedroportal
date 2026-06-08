'use client'

import { Link } from '@/i18n/navigation'
import { useWishlist } from '@/contexts/WishlistContext'

export default function NavbarClient() {
  const { count } = useWishlist()

  return (
    <Link href="/wishlist"
      className="relative flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 transition-colors">
      <svg className="w-4 h-4" viewBox="0 0 24 24"
        fill={count > 0 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 text-[10px] font-bold
                         bg-gold text-white rounded-full flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
