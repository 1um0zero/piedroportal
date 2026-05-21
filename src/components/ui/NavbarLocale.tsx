'use client'

import { useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { setLocaleAction } from '@/app/actions/locale'

export function NavbarLocale({ locales, current }: { locales: string[]; current: string }) {
  const router = useRouter()
  const [, start] = useTransition()

  function change(l: string) {
    start(async () => {
      await setLocaleAction(l)
      router.push('/', { locale: l })
    })
  }

  return (
    <div className="flex items-center gap-0.5">
      {locales.map(l => (
        <button key={l} onClick={() => change(l)}
          className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors
            ${l === current
              ? 'text-gold bg-gold/10'
              : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
