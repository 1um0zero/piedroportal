'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { saveTextsAction, proposeTranslationAction } from '@/app/actions/admin-texts'

const LOCALES = ['en', 'nl', 'fr', 'de'] as const
type Loc = (typeof LOCALES)[number]

const FIELDS: { base: string; multiline?: boolean }[] = [
  { base: 'sp_title' },
  { base: 'sp_body', multiline: true },
  { base: 'reset_subject' },
  { base: 'reset_heading' },
  { base: 'reset_body', multiline: true },
  { base: 'reset_cta' },
]

type Props = {
  current: Record<string, string>
  defaults: Record<string, Record<string, string>>
}

export default function TextsEditor({ current, defaults }: Props) {
  const t = useTranslations('adminTexts')
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...current }))
  const [loc, setLoc] = useState<Loc>('en')
  const [busy, setBusy] = useState(false)
  const [proposing, setProposing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const key = (base: string, l: Loc) => `${base}_${l}`
  const set = (k: string, v: string) => setValues(prev => ({ ...prev, [k]: v }))

  async function proposeFromEn() {
    setProposing(true); setMsg(null)
    for (const f of FIELDS) {
      const source = (values[key(f.base, 'en')] ?? '').trim() || defaults.en[f.base]
      const res = await proposeTranslationAction(source, loc)
      if (res.error) { setMsg(res.error); break }
      set(key(f.base, loc), res.translation ?? '')
    }
    setProposing(false)
  }

  async function save() {
    setBusy(true); setMsg(null)
    const res = await saveTextsAction(values)
    setBusy(false)
    setMsg(res.error ?? t('saved'))
    if (!res.error) router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-stone-800">{t('title')}</h1>
        <Link href="/admin/settings" className="text-sm text-gold hover:underline">← {t('back')}</Link>
      </div>
      <p className="text-sm text-stone-500 mb-6">{t('description')}</p>

      {/* Locale tabs */}
      <div className="flex gap-1 mb-5">
        {LOCALES.map(l => (
          <button key={l} onClick={() => setLoc(l)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors
              ${loc === l ? 'bg-gold text-white' : 'bg-white text-stone-500 hover:text-stone-800 border border-stone-200'}`}>
            {l.toUpperCase()}
          </button>
        ))}
        {loc !== 'en' && (
          <button onClick={proposeFromEn} disabled={proposing}
            className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg border border-gold text-gold
                       hover:bg-gold/10 disabled:opacity-50 flex items-center gap-2">
            {proposing && <span className="w-3.5 h-3.5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />}
            {t('propose_from_en')}
          </button>
        )}
      </div>

      <div className="bg-white rounded-[14px] p-6 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
        {FIELDS.map(f => {
          const k = key(f.base, loc)
          const placeholder = defaults[loc]?.[f.base] ?? ''
          return (
            <div key={f.base} className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">{t(`f_${f.base}`)}</label>
              {f.multiline ? (
                <textarea value={values[k] ?? ''} onChange={e => set(k, e.target.value)} placeholder={placeholder} rows={3}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
              ) : (
                <input value={values[k] ?? ''} onChange={e => set(k, e.target.value)} placeholder={placeholder}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-gold focus:outline-none" />
              )}
            </div>
          )
        })}
        <p className="text-xs text-stone-400">{t('revert_hint')}</p>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={busy}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold-dark disabled:opacity-40">
            {busy ? t('saving') : t('save')}
          </button>
          {msg && <span className="text-sm text-stone-500">{msg}</span>}
        </div>
      </div>
    </div>
  )
}
