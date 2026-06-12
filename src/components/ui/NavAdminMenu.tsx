'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

/**
 * "Backoffice" dropdown in the desktop navbar — groups the low-frequency admin
 * areas (companies, branches, users, translations, settings, docs) so the top
 * bar keeps only the daily-use links and never pushes the profile out of view.
 */
export default function NavAdminMenu() {
  const t = useTranslations('nav')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const items: Array<{ href: string; label: string }> = [
    { href: '/admin/companies',    label: t('companies') },
    { href: '/admin/branches',     label: t('branches') },
    { href: '/admin/users',        label: t('users') },
    { href: '/admin/translations', label: t('translations') },
    { href: '/admin/email',        label: t('email') },
    { href: '/admin/settings',     label: t('settings') },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1 text-xs font-semibold tracking-wider uppercase transition-colors
                    ${open ? 'text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
      >
        {t('backoffice')}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-3 w-52 bg-white rounded-[14px] border border-stone-100 py-2 z-50"
          style={{ boxShadow: 'var(--shadow-card)' }}>
          {items.map(it => (
            <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
              className="block px-4 py-2 text-[13px] font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors">
              {it.label}
            </Link>
          ))}
          <div className="my-1.5 border-t border-stone-100" />
          <a href="/share/index.html" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
            className="block px-4 py-2 text-[13px] font-medium text-gold hover:text-gold-dark hover:bg-stone-50 transition-colors">
            {t('docs')}
          </a>
          {/* One-time launch cut-over — visible to all admins, executable by super_admin */}
          <Link href="/admin/grand-opening" onClick={() => setOpen(false)}
            className="block px-4 py-2 text-[13px] font-semibold text-gold hover:text-gold-dark hover:bg-stone-50 transition-colors">
            🍾 {t('grand_opening')}
          </Link>
        </div>
      )}
    </div>
  )
}
