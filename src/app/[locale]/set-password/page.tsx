import { getLocale } from 'next-intl/server'
import { getSettings } from '@/lib/settings'
import SetPasswordForm from '@/components/auth/SetPasswordForm'

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const loc = await getLocale()
  // Admin-editable welcome text override (falls back to i18n defaults in the form).
  const ov = await getSettings([`sp_title_${loc}`, `sp_body_${loc}`])

  return (
    <SetPasswordForm
      token={typeof token === 'string' ? token : undefined}
      titleOverride={ov[`sp_title_${loc}`]}
      bodyOverride={ov[`sp_body_${loc}`]}
    />
  )
}
