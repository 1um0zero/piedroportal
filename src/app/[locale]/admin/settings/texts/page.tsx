import { getTranslations } from 'next-intl/server'
import { requirePiedroAdminPage } from '@/lib/admin/scope'
import { getSettings } from '@/lib/settings'
import { TEXT_BASES } from '@/lib/texts-config'
import TextsEditor from '@/components/admin/TextsEditor'

const LOCALES = ['en', 'nl', 'fr', 'de'] as const

export default async function AdminTextsPage() {
  await requirePiedroAdminPage()

  // Current overrides for every base × locale.
  const keys = TEXT_BASES.flatMap(b => LOCALES.map(l => `${b}_${l}`))
  const current = await getSettings(keys)

  // i18n defaults per locale (shown as placeholders / used as the AI source).
  const defaults: Record<string, Record<string, string>> = {}
  for (const loc of LOCALES) {
    const sp = await getTranslations({ locale: loc, namespace: 'setPassword' })
    const em = await getTranslations({ locale: loc, namespace: 'emails' })
    defaults[loc] = {
      sp_title: sp('title'),
      sp_body: sp('description'),
      reset_subject: em('reset_subject'),
      reset_heading: em('reset_heading'),
      reset_body: em('reset_body'),
      reset_cta: em('reset_cta'),
    }
  }

  return <TextsEditor current={current} defaults={defaults} />
}
