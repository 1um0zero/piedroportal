'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { LiveAnnouncement } from '@/lib/announcements-types'

/**
 * Renders the live announcements for one placement. Three display styles:
 *  - banner: an amber strip at the top of the page (always visible while live)
 *  - chip:   a floating button bottom-right that opens a panel (always present)
 *  - popup:  a centred modal, shown one at a time
 *
 * Per the product decision, messages stay visible for their whole date window;
 * dismissal (when allowed) only hides them for the current browser session. The
 * dismiss key carries the message `version`, so editing a message re-shows it.
 */
export default function AnnouncementBoard({ items }: { items: LiveAnnouncement[] }) {
  const t = useTranslations('announcements')
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)
  const [chipOpen, setChipOpen] = useState(false)

  const dkey = (a: LiveAnnouncement) => `ann-x:${a.id}:${a.version}`

  // Read session dismissals once on mount. Gated behind `ready` so the server
  // and first client render match (sessionStorage is unavailable on the server).
  useEffect(() => {
    const s = new Set<string>()
    try {
      for (const a of items) if (sessionStorage.getItem(dkey(a))) s.add(a.id)
    } catch { /* sessionStorage unavailable */ }
    setDismissed(s)
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismiss = (a: LiveAnnouncement) => {
    try { sessionStorage.setItem(dkey(a), '1') } catch { /* ignore */ }
    setDismissed(prev => new Set(prev).add(a.id))
  }

  const visible = (a: LiveAnnouncement) => !a.dismissible || !dismissed.has(a.id)

  const banners = items.filter(a => a.displayType === 'banner' && visible(a))
  const chips = items.filter(a => a.displayType === 'chip')
  const popups = items.filter(a => a.displayType === 'popup' && visible(a))

  if (!ready) return null

  // One pop-up at a time: dismissing the current one reveals the next.
  const activePopup = popups[0]
  const morePopups = popups.length > 1

  return (
    <>
      {/* ── Banners ─────────────────────────────────────────────────────── */}
      {banners.length > 0 && (
        <div className="space-y-2 px-4 pt-3">
          {banners.map(a => (
            <div key={a.id} role="note"
              className="mx-auto max-w-5xl rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M10.34 3.94c.66-1.2 2.66-1.2 3.32 0l7.5 13.5c.65 1.17-.2 2.56-1.66 2.56H4.5c-1.46 0-2.31-1.39-1.66-2.56l7.5-13.5ZM12 9v4m0 4h.01" />
                </svg>
                <div className="min-w-0 flex-1">
                  {a.title && <p className="text-sm font-semibold">{a.title}</p>}
                  <div className="announcement-body mt-0.5 text-[13px] leading-snug text-amber-800"
                    dangerouslySetInnerHTML={{ __html: a.bodyHtml }} />
                </div>
                {a.dismissible && (
                  <button type="button" onClick={() => dismiss(a)} aria-label={t('dismiss')}
                    className="shrink-0 text-amber-400 hover:text-amber-700 text-lg leading-none">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Popup (one at a time) ───────────────────────────────────────── */}
      {activePopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => dismiss(activePopup)}>
          <div onClick={e => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-[20px] bg-white"
            style={{ boxShadow: '0 24px 60px -12px rgba(28,25,23,0.45)' }}>
            <div className="px-8 pt-8 pb-6 text-center"
              style={{ background: 'linear-gradient(135deg,#B8975A 0%,#9A7A42 100%)' }}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/80">{t('badge')}</p>
              <h2 className="text-xl font-semibold text-white">{activePopup.title}</h2>
            </div>
            <div className="px-8 py-6">
              <div className="announcement-body text-sm leading-relaxed text-stone-700"
                dangerouslySetInnerHTML={{ __html: activePopup.bodyHtml }} />
              <button type="button" onClick={() => dismiss(activePopup)}
                className="mt-6 h-12 w-full rounded-[14px] bg-gold text-sm font-semibold tracking-wide text-white transition-colors hover:bg-gold-dark">
                {morePopups ? t('next') : t('got_it')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chip (floating) ─────────────────────────────────────────────── */}
      {chips.length > 0 && (
        <div className="fixed bottom-5 left-5 z-50 print:hidden">
          {chipOpen && (
            <div className="mb-3 w-80 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-[14px] bg-white"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gold-dark">{t('badge')}</p>
                <button type="button" onClick={() => setChipOpen(false)} aria-label={t('dismiss')}
                  className="text-stone-400 hover:text-stone-700 text-lg leading-none">×</button>
              </div>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-3">
                {chips.map(a => (
                  <div key={a.id}>
                    {a.title && <p className="text-sm font-semibold text-stone-800">{a.title}</p>}
                    <div className="announcement-body mt-0.5 text-[13px] leading-snug text-stone-600"
                      dangerouslySetInnerHTML={{ __html: a.bodyHtml }} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={() => setChipOpen(o => !o)}
            className="flex items-center gap-2 rounded-full bg-gold px-4 py-3 text-white transition-colors hover:bg-gold-dark"
            style={{ boxShadow: 'var(--shadow-card)' }} aria-label={t('open_messages')}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10.5 3.75a6 6 0 0 0-6 6v2.379a2.25 2.25 0 0 1-.659 1.591L2.5 14.66a.75.75 0 0 0 .53 1.28h17.94a.75.75 0 0 0 .53-1.28l-1.34-1.34a2.25 2.25 0 0 1-.66-1.591V9.75a6 6 0 0 0-6-6h-3ZM9 17.25a3 3 0 0 0 6 0H9Z" />
            </svg>
            <span className="rounded-full bg-white/25 px-1.5 text-xs font-bold">{chips.length}</span>
          </button>
        </div>
      )}
    </>
  )
}
