'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

const KEY = 'piedro-cookie-notice-dismissed'

// The portal sets only essential authentication cookies, so consent is not
// legally required — this is an informational notice (ePrivacy good practice).
export default function CookieNotice() {
  const t = useTranslations('footer')
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true)
    } catch {}
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-sm z-50
                    bg-white border border-stone-200 rounded-[14px] p-4 flex items-start gap-3"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-xs text-stone-600 flex-1">{t('cookie_notice')}</p>
      <button
        onClick={() => { try { localStorage.setItem(KEY, '1') } catch {}; setShow(false) }}
        className="shrink-0 px-3 py-1.5 bg-gold text-white text-xs font-semibold rounded-lg hover:bg-gold-dark transition-colors">
        {t('cookie_ok')}
      </button>
    </div>
  )
}
