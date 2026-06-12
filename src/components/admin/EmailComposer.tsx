'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { previewAudience, sendTestEmail, createCampaign, cancelCampaign, processNow } from '@/app/actions/admin-email'

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

export default function EmailComposer({ users, companies, campaigns }: {
  users: UserOpt[]
  companies: CompanyOpt[]
  campaigns: CampaignRow[]
}) {
  const t = useTranslations('adminEmail')
  const locale = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [audience, setAudience] = useState<'user' | 'company' | 'all_with_company'>('user')
  const [userSearch, setUserSearch] = useState('')
  const [userId, setUserId] = useState<string>('')
  const [companyId, setCompanyId] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [when, setWhen] = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

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
      if (!target) { setCount(null); return }
      const r = await previewAudience(audience, userId || null, companyId || null)
      if (!stale) setCount(r.count ?? null)
    }
    void load()
    return () => { stale = true }
  }, [audience, userId, companyId])

  const canSubmit = subject.trim() && body.trim() && !pending &&
    (audience === 'all_with_company' || (audience === 'user' ? !!userId : !!companyId)) &&
    (when === 'now' || !!scheduledAt)

  function submit() {
    setMsg(null)
    startTransition(async () => {
      const r = await createCampaign({
        subject, body, audience,
        targetUserId: audience === 'user' ? userId : null,
        targetCompanyId: audience === 'company' ? companyId : null,
        scheduledAt: when === 'later' ? new Date(scheduledAt).toISOString() : null,
      })
      if (r.error) setMsg({ kind: 'err', text: r.error })
      else {
        setMsg({ kind: 'ok', text: t('created', { count: r.recipients ?? 0 }) })
        setSubject(''); setBody(''); setScheduledAt(''); setWhen('now')
        router.refresh()
      }
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
            <p className="text-sm text-stone-600 mt-2">
              <span className="font-bold text-gold-dark">{count}</span> {t('recipients')}
            </p>
          )}
        </div>

        {/* Subject + body */}
        <div className="space-y-3">
          <input className={inputCls} placeholder={t('subject')} value={subject} onChange={e => setSubject(e.target.value)} />
          <textarea className={`${inputCls} min-h-[180px] leading-relaxed`} placeholder={t('body_placeholder')}
            value={body} onChange={e => setBody(e.target.value)} />
          <p className="text-xs text-stone-400">{t('body_hint')}</p>
        </div>

        {/* Footer preview */}
        <div className="border border-dashed border-stone-200 rounded-lg p-3">
          <p className="text-[10px] font-semibold tracking-wider uppercase text-stone-400 mb-1">{t('footer_preview')}</p>
          <p className="text-[11px] text-stone-400 leading-relaxed">
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
          <button type="button" disabled={!subject.trim() || !body.trim() || pending} onClick={test}
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
