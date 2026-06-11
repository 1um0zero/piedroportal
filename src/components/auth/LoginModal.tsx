'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { usePathname } from '@/i18n/navigation'
import LoginCard from './LoginCard'

/**
 * Floating login panel. Opened in place of redirecting to /login when an
 * action (ordering) needs a session — the user signs in and stays exactly
 * where they were: the card posts the current page as redirect_to.
 */
export default function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locale = useLocale()
  const pathname = usePathname() // locale-relative
  const redirectTo = locale === 'en' ? pathname : `/${locale}${pathname}`

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-500 shadow-md hover:text-stone-900"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <LoginCard redirectTo={redirectTo} />
      </div>
    </div>
  )
}
