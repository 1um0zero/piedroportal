'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { getWelcomeInfo, dismissWelcome } from '@/app/actions/welcome'

/**
 * One-time, personalised first-login welcome. Shows once per user (gated by
 * profiles.seen_welcome) the first time they land logged-in on the new portal.
 */
export default function WelcomeModal() {
  const { isLoggedIn, profile } = useAuth()
  const t = useTranslations('welcome')
  const [show, setShow] = useState(false)
  const [info, setInfo] = useState<{ name: string; company: string | null }>({ name: '', company: null })
  const [closing, setClosing] = useState(false)

  const eligible = isLoggedIn && profile != null && profile.seen_welcome === false

  useEffect(() => {
    if (!eligible) return
    let stale = false
    getWelcomeInfo().then(i => { if (!stale) { setInfo(i); setShow(true) } }).catch(() => {})
    return () => { stale = true }
  }, [eligible])

  const close = () => {
    setClosing(true)
    void dismissWelcome()
    setTimeout(() => { setShow(false); setClosing(false) }, 250)
  }

  if (!show) return null

  const highlights = [
    { t: t('h_gallery_t'),   d: t('h_gallery_d'),   icon: GalleryIcon },
    { t: t('h_orders_t'),    d: t('h_orders_d'),    icon: OrdersIcon },
    { t: t('h_stock_t'),     d: t('h_stock_d'),     icon: StockIcon },
    { t: t('h_assistant_t'), d: t('h_assistant_d'), icon: ChatIcon },
  ]

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-300
                  ${closing ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'rgba(28,25,23,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={close}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-lg bg-white rounded-[20px] overflow-hidden transition-all duration-300
                    ${closing ? 'scale-95' : 'scale-100'}`}
        style={{ boxShadow: '0 24px 60px -12px rgba(28,25,23,0.45)' }}
      >
        {/* Gold header band */}
        <div className="px-8 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(135deg,#B8975A 0%,#9A7A42 100%)' }}>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/80 mb-3">{t('badge')}</p>
          <h2 className="text-2xl font-semibold text-white">{t('title', { name: info.name || '' })}</h2>
          {info.company && <p className="text-sm text-white/85 mt-1">{info.company}</p>}
          <p className="text-[11px] tracking-[0.25em] uppercase text-white/60 mt-4">always one step ahead</p>
        </div>

        <div className="px-8 py-6">
          <p className="text-sm text-stone-600 leading-relaxed text-center mb-6">{t('lead')}</p>

          <div className="grid grid-cols-2 gap-3 mb-7">
            {highlights.map((h, i) => {
              const Icon = h.icon
              return (
                <div key={i} className="flex gap-3 p-3 rounded-[14px] bg-stone-50 border border-stone-100">
                  <div className="w-9 h-9 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0">
                    <Icon />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-stone-800 leading-tight">{h.t}</p>
                    <p className="text-[11px] text-stone-500 leading-snug mt-0.5">{h.d}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={close}
            className="w-full h-12 rounded-[14px] bg-gold text-white text-sm font-semibold tracking-wide
                       hover:bg-gold-dark transition-colors">
            {t('cta')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── icons (inherit currentColor) ─────────────────────────────────────────── */
const ico = 'w-[18px] h-[18px]'
function GalleryIcon() {
  return <svg className={ico} width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 6.75h.008v.008H18V6.75zM6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"/></svg>
}
function OrdersIcon() {
  return <svg className={ico} width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/></svg>
}
function StockIcon() {
  return <svg className={ico} width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/></svg>
}
function ChatIcon() {
  return <svg className={ico} width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>
}
