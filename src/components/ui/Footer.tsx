'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LEGAL } from '@/lib/legal-info'
import { EMPTY_CONTACT_INFO, type ContactInfo, type LocationType } from '@/lib/contact-info'

// Brand social glyphs — only rendered for links the admin has filled in.
const SOCIAL_ICONS: Record<keyof ContactInfo['social'], React.ReactNode> = {
  facebook: <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />,
  instagram: <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5.01-4.74.07-.9.04-1.38.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.33-.28.81-.32 1.71C3.21 8.5 3.2 8.85 3.2 12s.01 3.5.07 4.74c.04.9.19 1.38.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.33.13.81.28 1.71.32 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c.9-.04 1.38-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.33.28-.81.32-1.71.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.04-.9-.19-1.38-.32-1.71a2.86 2.86 0 0 0-.69-1.06 2.86 2.86 0 0 0-1.06-.69c-.33-.13-.81-.28-1.71-.32C15.5 4.01 15.15 4 12 4Zm0 3.06A4.94 4.94 0 1 1 7.06 12 4.94 4.94 0 0 1 12 7.06Zm0 8.14A3.2 3.2 0 1 0 8.8 12a3.2 3.2 0 0 0 3.2 3.2Zm5.14-8.34a1.15 1.15 0 1 1-1.15-1.15 1.15 1.15 0 0 1 1.15 1.15Z" />,
  linkedin: <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.74v20.51C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.74C24 .78 23.2 0 22.22 0Z" />,
  x: <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.01 4.12H5.05l12.03 15.65Z" />,
}
const SOCIAL_ORDER: (keyof ContactInfo['social'])[] = ['facebook', 'instagram', 'linkedin', 'x']

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

export default function Footer({ contact = EMPTY_CONTACT_INFO }: { contact?: ContactInfo }) {
  const t = useTranslations('footer')
  const locale = useLocale()
  const socials = SOCIAL_ORDER.filter(k => contact.social[k])
  const hasContact = socials.length > 0 || contact.locations.length > 0
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
      {hasContact && (
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-2">
          <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:justify-between">
            {contact.locations.map((loc, i) => (
              <div key={i} className="text-xs text-stone-500 leading-relaxed min-w-[180px]">
                <p className="font-semibold text-stone-700">
                  {loc.label || t(`location_type.${loc.type}` as `location_type.${LocationType}`)}
                </p>
                {loc.address && <p className="whitespace-pre-line mt-0.5">{loc.address}</p>}
                {loc.phone && (
                  <p className="mt-0.5">
                    <a href={`tel:${loc.phone.replace(/\s+/g, '')}`} className="hover:text-gold transition-colors">{loc.phone}</a>
                  </p>
                )}
                {loc.email && (
                  <p>
                    <a href={`mailto:${loc.email}`} className="hover:text-gold transition-colors">{loc.email}</a>
                  </p>
                )}
              </div>
            ))}
          </div>

          {socials.length > 0 && (
            <div className="flex items-center gap-3 mt-6">
              {socials.map(k => (
                <a key={k} href={contact.social[k]} target="_blank" rel="noopener noreferrer"
                  aria-label={k} title={k}
                  className="text-stone-400 hover:text-gold transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    {SOCIAL_ICONS[k]}
                  </svg>
                </a>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-stone-200/70" />
        </div>
      )}

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
