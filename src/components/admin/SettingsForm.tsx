'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { saveSettingsAction } from '@/app/[locale]/admin/settings/actions'

type Cfg = { order_notify_email?: string; admin_notify_email?: string; email_from?: string; notify_locale?: string }

const LOCALES = ['en', 'nl', 'fr', 'de'] as const

const FIELDS = [
  { key: 'order_notify_email', labelKey: 'order_notify_email', helpKey: 'order_notify_help', type: 'email' },
  { key: 'admin_notify_email', labelKey: 'admin_notify_email', helpKey: 'admin_notify_help', type: 'email' },
  { key: 'email_from',         labelKey: 'email_from',         helpKey: 'email_from_help',   type: 'text'  },
] as const

export default function SettingsForm({ current, envFallback }: { current: Cfg; envFallback: Cfg }) {
  const t = useTranslations('adminSettings')
  const [state, action, pending] = useActionState(saveSettingsAction, null)

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold text-stone-800 mb-1">{t('title')}</h1>
      <p className="text-sm text-stone-500 mb-8">{t('description')}</p>

      <form action={action} className="bg-white rounded-[14px] p-8 space-y-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        {FIELDS.map(f => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t(f.labelKey)}</label>
            <input
              name={f.key}
              type={f.type}
              defaultValue={current[f.key as keyof Cfg] ?? ''}
              placeholder={envFallback[f.key as keyof Cfg]
                ? t('using_env_fallback', { value: envFallback[f.key as keyof Cfg] as string })
                : ''}
              className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                         text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors"
            />
            <p className="text-xs text-stone-400">{t(f.helpKey)}</p>
          </div>
        ))}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('notify_locale')}</label>
          <select
            name="notify_locale"
            defaultValue={current.notify_locale ?? 'en'}
            className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                       text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors"
          >
            {LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
          <p className="text-xs text-stone-400">{t('notify_locale_help')}</p>
        </div>

        {state?.error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{state.error}</p>
        )}
        {state?.ok && (
          <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{t('saved')}</p>
        )}

        <button type="submit" disabled={pending}
          className="h-10 px-5 bg-gold text-white text-sm font-semibold rounded-lg
                     hover:bg-gold-dark transition-colors duration-150 disabled:opacity-60
                     flex items-center justify-center gap-2">
          {pending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {t('save')}
        </button>
      </form>

      <div className="mt-5">
        <Link href="/admin/settings/texts" className="text-sm text-gold hover:underline">
          {t('edit_texts')}
        </Link>
      </div>
    </div>
  )
}
