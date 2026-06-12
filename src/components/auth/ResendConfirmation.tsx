'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

/**
 * "Resend confirmation email" — for users whose signup link expired or never
 * arrived. Uses supabase.auth.resend, which has built-in enumeration
 * protection and a per-address cooldown, so we always show a neutral
 * "if the account exists…" message on success.
 */
export default function ResendConfirmation({ initialEmail = '' }: { initialEmail?: string }) {
  const t = useTranslations('auth')
  const [email, setEmail] = useState(initialEmail)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const sb = createClient()
    const { error: err } = await sb.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (err) {
      // Rate limit is the only error worth surfacing; anything else stays neutral.
      if (err.status === 429) { setError(t('resend_rate_limited')); return }
      console.error('resend confirmation:', err.message)
    }
    setSent(true)
  }

  if (sent) {
    return <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">{t('resend_sent')}</p>
  }

  return (
    <form onSubmit={handleResend} className="space-y-2">
      {!initialEmail && (
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email')}
          className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                     text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold/30
                     focus:border-gold transition-colors"
        />
      )}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 border border-gold text-gold text-sm font-semibold rounded-lg
                   hover:bg-gold hover:text-white transition-colors disabled:opacity-60
                   flex items-center justify-center gap-2"
      >
        {loading && <span className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />}
        {t('resend_confirmation')}
      </button>
    </form>
  )
}
