'use client'

import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { saveSettingsAction } from '@/app/[locale]/admin/settings/actions'

type Cfg = {
  order_notify_email?: string; admin_notify_email?: string; chat_notify_email?: string
  broadcast_reply_to?: string; email_from?: string; notify_locale?: string
  dispatch_days_normal?: string; dispatch_days_urgent?: string; dispatch_show_all?: string
}

const LOCALES = ['en', 'nl', 'fr', 'de'] as const

// Notify fields accept a comma/semicolon-separated list of addresses.
const FIELDS = [
  { key: 'order_notify_email', labelKey: 'order_notify_email', helpKey: 'order_notify_help', type: 'text' },
  { key: 'admin_notify_email', labelKey: 'admin_notify_email', helpKey: 'admin_notify_help', type: 'text' },
  { key: 'chat_notify_email',  labelKey: 'chat_notify_email',  helpKey: 'chat_notify_help',  type: 'text' },
  { key: 'broadcast_reply_to', labelKey: 'broadcast_reply_to', helpKey: 'broadcast_reply_help', type: 'text' },
  { key: 'email_from',         labelKey: 'email_from',         helpKey: 'email_from_help',   type: 'text' },
] as const

export default function SettingsForm({ current }: { current: Cfg }) {
  const t = useTranslations('adminSettings')
  const [state, action, pending] = useActionState(saveSettingsAction, null)
  // Controlled values: React 19 resets uncontrolled inputs after a form action,
  // which made the fields LOOK cleared right after a successful save.
  const [values, setValues] = useState<Cfg>(current)
  const set = (key: keyof Cfg) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues(v => ({ ...v, [key]: e.target.value }))

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
              value={values[f.key as keyof Cfg] ?? ''}
              onChange={set(f.key as keyof Cfg)}
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
            value={values.notify_locale ?? 'en'}
            onChange={set('notify_locale')}
            className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg
                       text-stone-900 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors"
          >
            {LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
          <p className="text-xs text-stone-400">{t('notify_locale_help')}</p>
        </div>

        {/* Expected-dispatch counter */}
        <div className="pt-5 border-t border-stone-100 space-y-4">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('dispatch_title')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('dispatch_days_normal')}</label>
              <input name="dispatch_days_normal" type="number" min={0} value={values.dispatch_days_normal ?? ''} onChange={set('dispatch_days_normal')}
                className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('dispatch_days_urgent')}</label>
              <input name="dispatch_days_urgent" type="number" min={0} value={values.dispatch_days_urgent ?? ''} onChange={set('dispatch_days_urgent')}
                className="w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" name="dispatch_show_all" checked={values.dispatch_show_all === '1'}
              onChange={e => setValues(v => ({ ...v, dispatch_show_all: e.target.checked ? '1' : '' }))} className="custom-gold" />
            {t('dispatch_show_all')}
          </label>
          <p className="text-xs text-stone-400">{t('dispatch_help')}</p>
          <Link href="/admin/factory-calendar" className="inline-block text-sm text-gold hover:underline">{t('dispatch_calendar_link')} →</Link>
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

      <div className="mt-5 flex flex-col gap-2">
        <Link href="/admin/settings/contacts" className="text-sm text-gold hover:underline">
          {t('edit_contacts')}
        </Link>
        <Link href="/admin/settings/texts" className="text-sm text-gold hover:underline">
          {t('edit_texts')}
        </Link>
      </div>
    </div>
  )
}
