'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LEGAL } from '@/lib/legal-info'

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? ''

// Best-effort "hard refresh" from a button — most users don't know Ctrl+Shift+R
// (and it differs on Mac/tablet). Clear any Cache Storage, then reload so the
// browser fetches the current deploy.
async function forceRefresh() {
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
  } catch { /* ignore */ }
  window.location.reload()
}

export default function Footer() {
  const t = useTranslations('footer')
  const locale = useLocale()
  const year = new Date().getFullYear()
  // Show the build date AND time — easier to tell "am I up to date?" after a
  // deploy than a commit hash. Rendered in the user's local timezone.
  const built = BUILD_TIME
    ? new Date(BUILD_TIME).toLocaleString(locale, {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : ''

  return (
    <footer className="border-t border-stone-200 bg-white/60 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-stone-400 text-center sm:text-left">
          © {year} {LEGAL.tradeName}. {t('rights')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            <Link href="/privacy" className="text-xs text-stone-500 hover:text-gold transition-colors">{t('privacy')}</Link>
            <Link href="/terms" className="text-xs text-stone-500 hover:text-gold transition-colors">{t('terms')}</Link>
            <Link href="/legal" className="text-xs text-stone-500 hover:text-gold transition-colors">{t('legal_notice')}</Link>
            <Link href="/privacy#subprocessors" className="text-xs text-stone-500 hover:text-gold transition-colors">{t('subprocessors')}</Link>
          </nav>

          {/* Version + force-refresh — lets users update without knowing Ctrl+Shift+R */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400" title={`v${VERSION}`}>
              {built ? t('updated', { datetime: built }) : `v${VERSION}`}
            </span>
            <button type="button" onClick={forceRefresh} title={t('refresh_hint')}
              className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1
                         text-[11px] font-medium text-stone-500 hover:text-gold hover:border-gold/50 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {t('refresh')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
