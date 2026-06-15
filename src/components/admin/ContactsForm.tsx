'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { saveContactsAction } from '@/app/[locale]/admin/settings/contacts/actions'
import { LOCATION_TYPES, type ContactInfo, type ContactLocation, type LocationType } from '@/lib/contact-info'

const SOCIAL: { key: keyof ContactInfo['social']; label: string; placeholder: string }[] = [
  { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/…' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
  { key: 'linkedin',  label: 'LinkedIn',  placeholder: 'https://linkedin.com/company/…' },
  { key: 'x',         label: 'X',         placeholder: 'https://x.com/…' },
]

const inputCls =
  'w-full h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg text-stone-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-colors'

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-medium text-stone-500 uppercase tracking-wide">{children}</label>
}

export default function ContactsForm({ current }: { current: ContactInfo }) {
  const t = useTranslations('adminContacts')
  const [info, setInfo] = useState<ContactInfo>(current)
  const [state, setState] = useState<{ ok?: boolean; error?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const setField = <K extends keyof ContactInfo>(key: K, value: ContactInfo[K]) =>
    setInfo(v => ({ ...v, [key]: value }))
  const setSocial = (key: keyof ContactInfo['social'], value: string) =>
    setInfo(v => ({ ...v, social: { ...v.social, [key]: value } }))
  const setLoc = (i: number, patch: Partial<ContactLocation>) =>
    setInfo(v => ({ ...v, locations: v.locations.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }))
  const addLoc = () =>
    setInfo(v => ({ ...v, locations: [...v.locations, { type: 'office', label: '', address: '', phone: '', email: '' }] }))
  const removeLoc = (i: number) =>
    setInfo(v => ({ ...v, locations: v.locations.filter((_, idx) => idx !== i) }))

  const save = () => {
    setState(null)
    startTransition(async () => setState(await saveContactsAction(info)))
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold text-stone-800 mb-1">{t('title')}</h1>
      <p className="text-sm text-stone-500 mb-8">{t('description')}</p>

      <div className="space-y-6">
        {/* Public contact */}
        <section className="bg-white rounded-[14px] p-8 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('public_title')}</h2>
          <div className="space-y-1.5">
            <Label>{t('contact_email')}</Label>
            <input type="email" value={info.email} onChange={e => setField('email', e.target.value)}
              placeholder="customerservice@piedro.nl" className={inputCls} />
            <p className="text-xs text-stone-400">{t('contact_email_help')}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{t('dpo_email')}</Label>
            <input type="email" value={info.dpoEmail} onChange={e => setField('dpoEmail', e.target.value)}
              placeholder="privacy@piedro.nl" className={inputCls} />
            <p className="text-xs text-stone-400">{t('dpo_email_help')}</p>
          </div>
        </section>

        {/* Social */}
        <section className="bg-white rounded-[14px] p-8 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('social_title')}</h2>
          <p className="text-xs text-stone-400 -mt-3">{t('social_help')}</p>
          {SOCIAL.map(s => (
            <div key={s.key} className="space-y-1.5">
              <Label>{s.label}</Label>
              <input type="url" value={info.social[s.key]} onChange={e => setSocial(s.key, e.target.value)}
                placeholder={s.placeholder} className={inputCls} />
            </div>
          ))}
        </section>

        {/* Locations */}
        <section className="bg-white rounded-[14px] p-8 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('locations_title')}</h2>
            <button type="button" onClick={addLoc}
              className="h-8 px-3 text-xs font-semibold text-gold border border-gold/40 rounded-lg hover:bg-gold/5 transition-colors">
              + {t('add_location')}
            </button>
          </div>
          {info.locations.length === 0 && <p className="text-xs text-stone-400">{t('no_locations')}</p>}

          {info.locations.map((loc, i) => (
            <div key={i} className="border border-stone-200 rounded-xl p-5 space-y-4 relative">
              <button type="button" onClick={() => removeLoc(i)}
                className="absolute top-3 right-3 text-stone-300 hover:text-red-500 transition-colors" title={t('remove')}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('loc_type')}</Label>
                  <select value={loc.type} onChange={e => setLoc(i, { type: e.target.value as LocationType })} className={inputCls}>
                    {LOCATION_TYPES.map(ty => <option key={ty} value={ty}>{t(`type_${ty}`)}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('loc_label')}</Label>
                  <input value={loc.label} onChange={e => setLoc(i, { label: e.target.value })}
                    placeholder={t('loc_label_ph')} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t('loc_address')}</Label>
                <textarea value={loc.address} onChange={e => setLoc(i, { address: e.target.value })} rows={2}
                  className={inputCls.replace('h-10', 'min-h-[64px] py-2')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t('loc_phone')}</Label>
                  <input value={loc.phone} onChange={e => setLoc(i, { phone: e.target.value })}
                    placeholder="+31 …" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('loc_email')}</Label>
                  <input type="email" value={loc.email} onChange={e => setLoc(i, { email: e.target.value })} className={inputCls} />
                </div>
              </div>
            </div>
          ))}
        </section>

        {state?.error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{state.error}</p>
        )}
        {state?.ok && (
          <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{t('saved')}</p>
        )}

        <div className="flex items-center gap-4">
          <button type="button" onClick={save} disabled={pending}
            className="h-10 px-5 bg-gold text-white text-sm font-semibold rounded-lg hover:bg-gold-dark
                       transition-colors duration-150 disabled:opacity-60 flex items-center justify-center gap-2">
            {pending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {t('save')}
          </button>
          <Link href="/admin/settings" className="text-sm text-stone-500 hover:text-gold transition-colors">
            ← {t('back_to_settings')}
          </Link>
        </div>
      </div>
    </div>
  )
}
