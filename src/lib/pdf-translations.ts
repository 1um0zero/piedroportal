import type { Locale } from '@/types'
import en from '../../messages/en.json'
import nl from '../../messages/nl.json'
import fr from '../../messages/fr.json'
import de from '../../messages/de.json'

type Messages = typeof en

const messages: Record<Locale, Messages> = {  en,
  nl,
  fr,
  de,
}

export function getPdfTranslation(locale: Locale, key: string): string {
  const msg = messages[locale]
  const parts = key.split('.')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = msg
  for (const part of parts) {
    value = value?.[part]
    if (value === undefined) break
  }

  return typeof value === 'string' ? value : key
}

export function getUnitLabel(locale: Locale, unit: string): string {
  switch (unit) {
    case 'PAIR':
      return getPdfTranslation(locale, 'order.unit_pair').toUpperCase()
    case 'LEFT':
      return getPdfTranslation(locale, 'order.unit_left').toUpperCase()
    case 'RIGHT':
      return getPdfTranslation(locale, 'order.unit_right').toUpperCase()
    case 'LEFT_RIGHT':
      return getPdfTranslation(locale, 'order.unit_lr').split(' ')[0].toUpperCase() + '+' + getPdfTranslation(locale, 'order.right').toUpperCase()
    case 'DIFF_SIZES':
      return getPdfTranslation(locale, 'order.pairs_short').toUpperCase()
    default:
      return unit
  }
}

export function getDateLocale(locale: Locale): string {
  switch (locale) {
    case 'en': return 'en-GB'
    case 'nl': return 'nl-NL'
    case 'fr': return 'fr-FR'
    case 'de': return 'de-DE'
    default: return 'en-GB'
  }
}
