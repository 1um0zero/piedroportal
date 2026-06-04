'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LEGAL } from '@/lib/legal-info'

export default function Footer() {
  const t = useTranslations('footer')
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-stone-200 bg-white/60 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-stone-400 text-center sm:text-left">
          © {year} {LEGAL.tradeName}. {t('rights')}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          <Link href="/privacy" className="text-xs text-stone-500 hover:text-gold transition-colors">{t('privacy')}</Link>
          <Link href="/terms" className="text-xs text-stone-500 hover:text-gold transition-colors">{t('terms')}</Link>
          <Link href="/legal" className="text-xs text-stone-500 hover:text-gold transition-colors">{t('legal_notice')}</Link>
          <Link href="/privacy#subprocessors" className="text-xs text-stone-500 hover:text-gold transition-colors">{t('subprocessors')}</Link>
        </nav>
      </div>
    </footer>
  )
}
