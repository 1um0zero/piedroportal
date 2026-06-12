'use client'

import { useTranslations } from 'next-intl'

/**
 * "Email not arriving?" checklist shown wherever the portal sends the user an
 * email (signup confirmation, password reset, resend). Wording covers the
 * three usual causes: wrong address, junk filtering, and untrusted sender.
 */
export default function EmailDeliveryTips() {
  const t = useTranslations('auth')

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-2.5 text-left">
      <p className="text-xs font-semibold text-gold uppercase tracking-wide">
        {t('email_tips_title')}
      </p>
      {[t('email_tips_address'), t('email_tips_junk'), t('email_tips_trusted')].map((tip, i) => (
        <p key={i} className="flex gap-2 text-xs text-stone-500 leading-relaxed">
          <span className="text-gold font-semibold shrink-0">{i + 1}.</span>
          <span>{tip}</span>
        </p>
      ))}
    </div>
  )
}
