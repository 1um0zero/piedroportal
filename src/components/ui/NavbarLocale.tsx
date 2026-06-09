'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { setLocaleAction } from '@/app/actions/locale'

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN', nl: 'NL', fr: 'FR', de: 'DE',
}

export function NavbarLocale({ locales, current }: { locales: string[]; current: string }) {
  const router    = useRouter()
  const pathname  = usePathname()
  const [, start] = useTransition()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function change(l: string) {
    setOpen(false)
    if (l === current) return
    // Preserve the live query string (e.g. the order-form session id ?s=…) so
    // switching language doesn't drop it and lose / cross-wire in-progress state.
    const qs = typeof window !== 'undefined' ? window.location.search : ''
    start(async () => {
      await setLocaleAction(l)
      router.push(qs ? `${pathname}${qs}` : pathname, { locale: l })
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg
                   text-gold bg-gold/10 hover:bg-gold/20 transition-colors">
        {LOCALE_LABELS[current] ?? current.toUpperCase()}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-stone-100 rounded-xl
                        shadow-lg py-1 min-w-[80px] z-50">
          {locales.map(l => (
            <button key={l} onClick={() => change(l)}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors
                ${l === current
                  ? 'text-gold bg-gold/5'
                  : 'text-stone-600 hover:bg-stone-50'}`}>
              {LOCALE_LABELS[l] ?? l.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
