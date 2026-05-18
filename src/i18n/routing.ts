import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'nl', 'fr', 'de'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})
