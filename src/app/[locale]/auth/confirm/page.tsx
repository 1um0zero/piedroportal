import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { notifyAdminNewUser } from '@/lib/notify-new-user'
import ResendConfirmation from '@/components/auth/ResendConfirmation'
import EmailDeliveryTips from '@/components/auth/EmailDeliveryTips'

/**
 * Click-to-confirm landing for Supabase auth emails. The email links here
 * (with token_hash) instead of the one-click {{ .ConfirmationURL }} because
 * Outlook SafeLinks & co. prefetch links and burn the single-use token before
 * the user clicks. A GET on this page is harmless — the token is only consumed
 * by the explicit button press (Server Action POST).
 */

const OTP_TYPES: EmailOtpType[] = ['signup', 'email', 'invite', 'magiclink', 'recovery', 'email_change']

async function confirmAction(formData: FormData) {
  'use server'
  const tokenHash = String(formData.get('token_hash') ?? '')
  const rawType = String(formData.get('type') ?? 'signup')
  const type = (OTP_TYPES.includes(rawType as EmailOtpType) ? rawType : 'signup') as EmailOtpType
  const locale = String(formData.get('locale') ?? 'en')
  const prefix = locale === 'en' ? '' : `/${locale}`

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error || !data.user) redirect(`${prefix}/auth/confirm?error=1`)

  const user = data.user
  const isNewUser = Date.now() - new Date(user.created_at).getTime() < 60 * 60 * 1000
  if (isNewUser) {
    await notifyAdminNewUser(user.email ?? '', (user.user_metadata?.full_name as string) ?? '')
  }

  redirect(`${prefix}/gallery`)
}

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token_hash?: string; type?: string; error?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const { token_hash, type, error } = await searchParams
  const t = await getTranslations('auth')
  const failed = !!error || !token_hash

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-2xl font-semibold tracking-[0.22em] text-stone-900 uppercase mb-1">Piedro</p>
          <p className="text-[11px] font-medium tracking-[0.3em] text-gold uppercase">Portal</p>
        </div>

        <div className="bg-white rounded-[14px] p-8 space-y-4 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
          {failed ? (
            <>
              <h1 className="font-semibold text-stone-800">{t('confirm_failed_title')}</h1>
              <p className="text-sm text-stone-500">{t('confirm_failed_body')}</p>
              <EmailDeliveryTips />
              <div className="pt-2 text-left">
                <ResendConfirmation />
              </div>
              <a href={locale === 'en' ? '/register' : `/${locale}/register`}
                 className="inline-block text-sm text-gold hover:underline">
                {t('register')}
              </a>
            </>
          ) : (
            <>
              <h1 className="font-semibold text-stone-800">{t('confirm_title')}</h1>
              <p className="text-sm text-stone-500">{t('confirm_body')}</p>
              <form action={confirmAction}>
                <input type="hidden" name="token_hash" value={token_hash} />
                <input type="hidden" name="type" value={type ?? 'signup'} />
                <input type="hidden" name="locale" value={locale} />
                <button type="submit"
                  className="w-full h-11 bg-gold text-white text-sm font-semibold rounded-lg
                             hover:bg-gold-dark transition-colors">
                  {t('confirm_cta')}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          Piedro International © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
