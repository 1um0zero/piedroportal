'use client'

/**
 * Persistent top banner shown whenever an admin is acting as another user. Makes
 * the act-as state impossible to miss (the rest of the portal renders exactly as
 * the target sees it) and offers a one-click return to the admin's own account.
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { stopImpersonation } from '@/app/actions/impersonation'
import { useImpersonation } from '@/contexts/ImpersonationContext'

export default function ImpersonationBanner({ locale }: { locale: string }) {
  const t = useTranslations('impersonation')
  const { isImpersonating, targetName } = useImpersonation()
  const [leaving, setLeaving] = useState(false)

  if (!isImpersonating) return null

  async function back() {
    setLeaving(true)
    await stopImpersonation()
    // Hard reload so the server re-reads the restored admin session cookies.
    window.location.replace(`/${locale}/admin/users`)
  }

  return (
    <div className="sticky top-0 z-[150] flex items-center justify-center gap-4 bg-stone-900 px-4 py-2 text-sm text-white">
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
        {t('banner_label', { name: targetName ?? '' })}
      </span>
      <button
        onClick={back}
        disabled={leaving}
        className="rounded-lg bg-gold px-3 py-1 text-xs font-semibold text-white hover:bg-gold-dark disabled:opacity-50">
        {leaving ? t('returning') : t('back')}
      </button>
    </div>
  )
}
