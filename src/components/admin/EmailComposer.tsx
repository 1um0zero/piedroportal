'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { previewAudience, sendTestEmail, createCampaign, cancelCampaign, processNow, saveSignature, proposeTranslations, type CampaignVariant } from '@/app/actions/admin-email'
import RichTextEditor from '@/components/admin/RichTextEditor'

export interface CampaignRow {
  id: string
  subject: string
  audience: 'user' | 'company' | 'all_with_company'
  scheduled_at: string
  status: 'scheduled' | 'sending' | 'sent' | 'cancelled'
  total_recipients: number
  sent_count: number
  failed_count: number
  created_at: string
}

interface UserOpt { id: string; name: string; email: string }
interface CompanyOpt { id: string; name: string }

const STATUS_BADGE: Record<CampaignRow['status'], string> = {
  scheduled: 'bg-blue-50 text-blue-600',
  sending: 'bg-amber-50 text-amber-600',
  sent: 'bg-green-50 text-green-600',
  cancelled: 'bg-stone-100 text-stone-500',
}

export default function EmailComposer({ users, companies, campaigns, signatureHtml }: {
  users: UserOpt[]
  companies: CompanyOpt[]
  campaigns: CampaignRow[]
  signatureHtml: string
}) {
  const t = useTranslations('adminEmail')
  const locale = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [audience, setAudience] = useState<'user' | 'company' | 'all_with_company'>('user')
  const [userSearch, setUserSearch] = useState('')
  const [userId, setUserId] = useState<string>('')
  const [companyId, setCompanyId] = useState<string>('')
  // Seed the editor with a localized greeting so the {{name}} placeholder is discoverable.
  const defaultBody = `<p>${t('greeting')}</p><p><br/></p>`
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState(defaultBody) // rich HTML from the editor
  const [editorKey, setEditorKey] = useState(0) // bump to reset the uncontrolled editor
  const [signature, setSignature] = useState(signatureHtml)
  const [sigOpen, setSigOpen] = useState(false)
  const [when, setWhen] = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [recipOpen, setRecipOpen] = useState(false)
  const [extraTo, setExtraTo] = useState('')
  const [extraCc, setExtraCc] = useState('')
  const [extraBcc, setExtraBcc] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const [byLocale, setByLocale] = useState<Record<string, number>>({})
  const [srcLocale, setSrcLocale] = useState('en')
  const [variants, setVariants] = useState<Record<string, CampaignVariant>>({})
  const [activeVar, setActiveVar] = useState<string | null>(null)
  const [varKey, setVarKey] = useState(0) // bump to remount the variant editors
  const [translating, setTranslating] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const LOCALES = ['en', 'nl', 'fr', 'de']
  // Languages actually present in the selected audience, beyond the original.
  const targetLocales = LOCALES.filter(l => l !== srcLocale && (byLocale[l] ?? 0) > 0)

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users.slice(0, 100)
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).slice(0, 100)
  }, [users, userSearch])

  // Live recipient counter for the selected audience.
  useEffect(() => {
    const target = audience === 'user' ? userId : audience === 'company' ? companyId : 'all'
    let stale = false
    const load = async () => {
      if (!target) { setCount(null); setByLocale({}); return }
      const r = await previewAudience(audience, userId || null, companyId || null)
      if (!stale) { setCount(r.count ?? null); setByLocale(r.byLocale ?? {}) }
    }
    void load()
    return () => { stale = true }
  }, [audience, userId, companyId])

  const hasBody = !!body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() || /<img\b/i.test(body)
  const canSubmit = subject.trim() && hasBody && !pending &&
    (audience === 'all_with_company' || (audience === 'user' ? !!userId : !!companyId)) &&
    (when === 'now' || !!scheduledAt)

  function submit() {
    setMsg(null)
    startTransition(async () => {
      const r = await createCampaign({
        subject, bodyHtml: body, audience,
        targetUserId: audience === 'user' ? userId : null,
        targetCompanyId: audience === 'company' ? companyId : null,
        scheduledAt: when === 'later' ? new Date(scheduledAt).toISOString() : null,
        extraTo, extraCc, extraBcc,
        translations: Object.keys(variants).length ? variants : undefined,
      })
      if (r.error) setMsg({ kind: 'err', text: r.error })
      else {
        setMsg({ kind: 'ok', text: t('created', { count: r.recipients ?? 0 }) })
        setSubject(''); setBody(defaultBody); setEditorKey(k => k + 1); setScheduledAt(''); setWhen('now')
        setExtraTo(''); setExtraCc(''); setExtraBcc(''); setRecipOpen(false)
        setVariants({}); setActiveVar(null); setVarKey(k => k + 1)
        router.refresh()
      }
    })
  }

  function translate() {
    setMsg(null)
    setTranslating(true)
    startTransition(async () => {
      const r = await proposeTranslations(subject, body, srcLocale, targetLocales)
      setTranslating(false)
      if (r.error || !r.translations) {
        setMsg({ kind: 'err', text: r.error ?? 'Translation failed' })
        return
      }
      setVariants(r.translations)
      setActiveVar(Object.keys(r.translations)[0] ?? null)
      setVarKey(k => k + 1)
      setMsg({ kind: 'ok', text: t('translations_ready', { langs: Object.keys(r.translations).join(', ').toUpperCase() }) })
    })
  }

  function test() {
    setMsg(null)
    startTransition(async () => {
      const r = await sendTestEmail(subject, body)
      setMsg(r.error ? { kind: 'err', text: r.error } : { kind: 'ok', text: t('test_sent') })
    })
  }

  function runNow() {
    setMsg(null)
    startTransition(async () => {
      const r = await processNow()
      setMsg(r.error
        ? { kind: 'err', text: r.error }
        : { kind: 'ok', text: t('processed', { sent: r.sent ?? 0, remaining: r.remaining ?? 0 }) })
      router.refresh()
    })
  }

  const inputCls = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold'
  const radioCls = (active: boolean) =>
    `px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase border transition-colors cursor-pointer
     ${active ? 'bg-gold text-white border-gold' : 'bg-white text-stone-500 border-stone-200 hover:border-gold/60'}`

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">{t('title')}</h1>
        <p className="text-sm text-stone-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[14px] p-6 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
        {/* Audience */}
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-stone-400 mb-2">{t('audience')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={radioCls(audience === 'user')} onClick={() => setAudience('user')}>{t('audience_user')}</button>
            <button type="button" className={radioCls(audience === 'company')} onClick={() => setAudience('company')}>{t('audience_company')}</button>
            <button type="button" className={radioCls(audience === 'all_with_company')} onClick={() => setAudience('all_with_company')}>{t('audience_all')}</button>
          </div>

          {audience === 'user' && (
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              <input className={inputCls} placeholder={t('search_user')} value={userSearch}
                onChange={e => setUserSearch(e.target.value)} />
              <select className={inputCls} value={userId} onChange={e => setUserId(e.target.value)}>
                <option value="">{t('select_user')}</option>
                {filteredUsers.map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
              </select>
            </div>
          )}
          {audience === 'company' && (
            <select className={`${inputCls} mt-3`} value={companyId} onChange={e => setCompanyId(e.target.value)}>
              <option value="">{t('select_company')}</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {count != null && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-stone-600 mt-2">
              <span><span className="font-bold text-gold-dark">{count}</span> {t('recipients')}</span>
              {LOCALES.filter(l => (byLocale[l] ?? 0) > 0).map(l => (
                <span key={l} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500 uppercase">
                  {l} · {byLocale[l]}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Subject + body */}
        <div className="space-y-3">
          <input className={inputCls} placeholder={t('subject')} value={subject} onChange={e => setSubject(e.target.value)} />
          <RichTextEditor key={editorKey} initialHtml={defaultBody} onChange={setBody} placeholder={t('body_placeholder')} />
          <p className="text-xs text-stone-400">{t('body_hint')}</p>
        </div>

        {/* ── Per-language translations ──────────────────────────────────── */}
        {targetLocales.length > 0 && (
          <div className="border border-dashed border-stone-200 rounded-lg p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold tracking-wider uppercase text-stone-400">{t('translations_title')}</p>
              <label className="ml-auto flex items-center gap-1.5 text-xs text-stone-500">
                {t('original_language')}
                <select className="border border-stone-200 rounded px-1.5 py-1 text-xs uppercase"
                  value={srcLocale} onChange={e => setSrcLocale(e.target.value)}>
                  {LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
              </label>
              <button type="button" disabled={!subject.trim() || !hasBody || pending || translating} onClick={translate}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold/10 text-gold-dark hover:bg-gold/20 transition-colors disabled:opacity-40">
                {translating ? t('translating') : t('btn_translate', { langs: targetLocales.join(', ').toUpperCase() })}
              </button>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">{t('translations_hint')}</p>

            {Object.keys(variants).length > 0 && (
              <div className="space-y-3">
                <div className="flex gap-1">
                  {Object.keys(variants).map(l => (
                    <button key={l} type="button" onClick={() => setActiveVar(l)}
                      className={`px-3 py-1.5 rounded-t-lg text-xs font-bold uppercase border-b-2 transition-colors
                        ${activeVar === l ? 'border-gold text-gold-dark' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                      {l} · {byLocale[l] ?? 0}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => { setVariants({}); setActiveVar(null); setVarKey(k => k + 1) }}
                    className="ml-auto px-2 text-xs font-semibold text-red-400 hover:text-red-600">
                    {t('discard_translations')}
                  </button>
                </div>
                {activeVar && variants[activeVar] && (
                  <div className="space-y-2">
                    <input className={inputCls} value={variants[activeVar].subject}
                      onChange={e => setVariants(v => ({ ...v, [activeVar]: { ...v[activeVar], subject: e.target.value } }))} />
                    <RichTextEditor key={`${activeVar}-${varKey}`} minHeight={140}
                      initialHtml={variants[activeVar].bodyHtml}
                      onChange={html => setVariants(v => ({ ...v, [activeVar]: { ...v[activeVar], bodyHtml: html } }))} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Extra header recipients (To / Cc / Bcc) */}
        <div>
          <button type="button" onClick={() => setRecipOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-stone-400 hover:text-stone-600">
            <span className={`inline-block transition-transform ${recipOpen ? 'rotate-90' : ''}`}>▸</span>
            {t('recip_edit')}
            {(extraTo || extraCc || extraBcc) && <span className="text-gold">●</span>}
          </button>
          {recipOpen && (
            <div className="mt-3 space-y-2">
              {([['To', extraTo, setExtraTo], ['Cc', extraCc, setExtraCc], ['Bcc', extraBcc, setExtraBcc]] as const)
                .map(([label, value, set]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="w-10 text-xs font-semibold text-stone-500">{label}</span>
                    <input className={inputCls} placeholder={t('recip_placeholder')} value={value}
                      onChange={e => set(e.target.value)} />
                  </div>
                ))}
              <p className="text-xs text-stone-400">{t('recip_hint')}</p>
            </div>
          )}
        </div>

        {/* Signature + footer */}
        <div className="border border-dashed border-stone-200 rounded-lg p-3 space-y-2">
          <button type="button" onClick={() => setSigOpen(o => !o)}
            className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase text-stone-400 hover:text-stone-600">
            <span className={`inline-block transition-transform ${sigOpen ? 'rotate-90' : ''}`}>▸</span>
            {t('signature')}
          </button>
          {sigOpen ? (
            <div className="space-y-2">
              <RichTextEditor initialHtml={signatureHtml} onChange={setSignature}
                minHeight={90} placeholder={t('signature_hint')} />
              <button type="button" disabled={pending}
                onClick={() => startTransition(async () => {
                  const r = await saveSignature(signature)
                  setMsg(r.error ? { kind: 'err', text: r.error } : { kind: 'ok', text: t('signature_saved') })
                })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-200 text-stone-600 hover:border-gold hover:text-gold-dark transition-colors disabled:opacity-40">
                {t('save_signature')}
              </button>
            </div>
          ) : signature ? (
            <div className="text-[12px] text-stone-500 leading-relaxed [&_img]:max-h-16 [&_img]:w-auto"
              dangerouslySetInnerHTML={{ __html: signature }} />
          ) : null}
          <p className="text-[11px] text-stone-400 leading-relaxed border-t border-stone-100 pt-2">
            {t('footer_text')}<br />Piedro International · piedroportal.vercel.app
          </p>
        </div>

        {/* Schedule */}
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-stone-400 mb-2">{t('schedule')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={radioCls(when === 'now')} onClick={() => setWhen('now')}>{t('send_now')}</button>
            <button type="button" className={radioCls(when === 'later')} onClick={() => setWhen('later')}>{t('send_later')}</button>
            {when === 'later' && (
              <input type="datetime-local" className={`${inputCls} !w-auto`} value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)} />
            )}
          </div>
          {audience === 'all_with_company' && (
            <p className="text-xs text-amber-600 mt-2">{t('throttle_note')}</p>
          )}
        </div>

        {msg && (
          <p className={`text-sm font-medium ${msg.kind === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <button type="button" disabled={!subject.trim() || !hasBody || pending} onClick={test}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-stone-200 text-stone-600 hover:border-gold hover:text-gold-dark transition-colors disabled:opacity-40">
            {t('send_test')}
          </button>
          <button type="button" disabled={!canSubmit} onClick={submit}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-gold text-white hover:bg-gold-dark transition-colors disabled:opacity-40">
            {pending ? t('working') : when === 'now' ? t('btn_send') : t('btn_schedule')}
          </button>
        </div>
      </div>

      {/* ── Campaign history ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-stone-800">{t('history')}</h2>
          <button type="button" onClick={runNow} disabled={pending}
            className="text-xs font-semibold text-gold hover:text-gold-dark disabled:opacity-40">
            {t('process_now')}
          </button>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-sm text-stone-400">{t('no_campaigns')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  <th className="py-2 pr-4">{t('col_subject')}</th>
                  <th className="py-2 pr-4">{t('col_audience')}</th>
                  <th className="py-2 pr-4">{t('col_scheduled')}</th>
                  <th className="py-2 pr-4">{t('col_progress')}</th>
                  <th className="py-2 pr-4">{t('col_status')}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-b border-stone-50">
                    <td className="py-2.5 pr-4 font-medium text-stone-700 max-w-[260px] truncate">{c.subject}</td>
                    <td className="py-2.5 pr-4 text-stone-500">
                      {c.audience === 'user' ? t('audience_user') : c.audience === 'company' ? t('audience_company') : t('audience_all')}
                    </td>
                    <td className="py-2.5 pr-4 text-stone-500 whitespace-nowrap">
                      {new Date(c.scheduled_at).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5 pr-4 text-stone-600 whitespace-nowrap">
                      {c.sent_count}/{c.total_recipients}
                      {c.failed_count > 0 && <span className="text-red-400"> · {c.failed_count} {t('failed')}</span>}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[c.status]}`}>
                        {t(`status_${c.status}`)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {(c.status === 'scheduled' || c.status === 'sending') && (
                        <button type="button" disabled={pending}
                          onClick={() => startTransition(async () => { await cancelCampaign(c.id); router.refresh() })}
                          className="text-xs font-semibold text-red-400 hover:text-red-600 disabled:opacity-40">
                          {t('cancel')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
