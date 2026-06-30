'use client'

import { useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import RichTextEditor from '@/components/admin/RichTextEditor'
import {
  saveAnnouncement, setAnnouncementActive, deleteAnnouncement, proposeAnnouncementTranslations,
} from '@/app/actions/announcements'
import {
  ANNOUNCEMENT_DISPLAYS, ANNOUNCEMENT_PLACEMENTS, ANNOUNCEMENT_LOCALES,
  type Announcement, type AnnouncementDisplay, type AnnouncementPlacement, type AnnouncementVariant,
} from '@/lib/announcements-types'

// datetime-local <-> ISO helpers (value is wall-clock in the browser's tz).
const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)

const blankBody = '<p></p>'

export default function AnnouncementComposer({ announcements }: { announcements: Announcement[] }) {
  const t = useTranslations('adminAnnouncements')
  const locale = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [srcLocale, setSrcLocale] = useState('nl') // most messages are NL-first
  const [body, setBody] = useState(blankBody)
  const [editorKey, setEditorKey] = useState(0)
  const [editorInitial, setEditorInitial] = useState(blankBody)
  const [displayType, setDisplayType] = useState<AnnouncementDisplay>('popup')
  const [placement, setPlacement] = useState<AnnouncementPlacement[]>(['after_login'])
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [active, setActive] = useState(true)
  const [dismissible, setDismissible] = useState(true)

  const [variants, setVariants] = useState<Record<string, AnnouncementVariant>>({})
  const [activeVar, setActiveVar] = useState<string | null>(null)
  const [varKey, setVarKey] = useState(0)
  const [translating, setTranslating] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const targetLocales = ANNOUNCEMENT_LOCALES.filter(l => l !== srcLocale)
  const hasBody = !!body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() || /<img\b/i.test(body)
  const canSave = title.trim() && hasBody && placement.length > 0 && !pending

  function reset() {
    setEditingId(null); setTitle(''); setBody(blankBody); setEditorInitial(blankBody); setEditorKey(k => k + 1)
    setDisplayType('popup'); setPlacement(['after_login']); setStartsAt(''); setEndsAt('')
    setActive(true); setDismissible(true)
    setVariants({}); setActiveVar(null); setVarKey(k => k + 1)
  }

  function edit(a: Announcement) {
    setEditingId(a.id); setTitle(a.title); setSrcLocale(a.sourceLocale)
    setBody(a.bodyHtml); setEditorInitial(a.bodyHtml); setEditorKey(k => k + 1)
    setDisplayType(a.displayType); setPlacement(a.placement)
    setStartsAt(toLocalInput(a.startsAt)); setEndsAt(toLocalInput(a.endsAt))
    setActive(a.active); setDismissible(a.dismissible)
    setVariants(a.translations ?? {}); setActiveVar(a.translations ? Object.keys(a.translations)[0] ?? null : null)
    setVarKey(k => k + 1)
    setMsg(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function togglePlacement(p: AnnouncementPlacement) {
    setPlacement(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  function translate() {
    setMsg(null); setTranslating(true)
    startTransition(async () => {
      const r = await proposeAnnouncementTranslations(title, body, srcLocale, targetLocales)
      setTranslating(false)
      if (r.error || !r.translations) { setMsg({ kind: 'err', text: r.error ?? 'Translation failed' }); return }
      setVariants(r.translations); setActiveVar(Object.keys(r.translations)[0] ?? null); setVarKey(k => k + 1)
      setMsg({ kind: 'ok', text: t('translations_ready', { langs: Object.keys(r.translations).join(', ').toUpperCase() }) })
    })
  }

  function save() {
    setMsg(null)
    startTransition(async () => {
      const r = await saveAnnouncement({
        id: editingId ?? undefined,
        title, sourceLocale: srcLocale, bodyHtml: body,
        translations: Object.keys(variants).length ? variants : undefined,
        displayType, placement,
        startsAt: fromLocalInput(startsAt), endsAt: fromLocalInput(endsAt),
        active, dismissible,
      })
      if (r.error) setMsg({ kind: 'err', text: r.error })
      else { setMsg({ kind: 'ok', text: t('saved') }); reset(); router.refresh() }
    })
  }

  const inputCls = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold'
  const chip = (on: boolean) =>
    `px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase border transition-colors cursor-pointer
     ${on ? 'bg-gold text-white border-gold' : 'bg-white text-stone-500 border-stone-200 hover:border-gold/60'}`

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">{t('title')}</h1>
        <p className="text-sm text-stone-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[14px] p-6 space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
        {editingId && (
          <p className="text-xs font-semibold text-gold-dark">
            {t('editing')} <button type="button" onClick={reset} className="underline hover:no-underline">{t('new_instead')}</button>
          </p>
        )}

        {/* Title + source locale */}
        <div className="flex gap-2">
          <input className={inputCls} placeholder={t('field_title')} value={title} onChange={e => setTitle(e.target.value)} />
          <label className="flex items-center gap-1.5 text-xs text-stone-500 whitespace-nowrap">
            {t('original_language')}
            <select className="border border-stone-200 rounded px-1.5 py-2 text-xs uppercase"
              value={srcLocale} onChange={e => setSrcLocale(e.target.value)}>
              {ANNOUNCEMENT_LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </label>
        </div>

        {/* Body */}
        <div className="space-y-1">
          <RichTextEditor key={editorKey} initialHtml={editorInitial} onChange={setBody} placeholder={t('body_placeholder')} />
          <p className="text-xs text-stone-400">{t('body_hint')}</p>
        </div>

        {/* Translations */}
        <div className="border border-dashed border-stone-200 rounded-lg p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-wider uppercase text-stone-400">{t('translations_title')}</p>
            <button type="button" disabled={!title.trim() || !hasBody || pending || translating} onClick={translate}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold/10 text-gold-dark hover:bg-gold/20 transition-colors disabled:opacity-40">
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
                    {l}
                  </button>
                ))}
                <button type="button" onClick={() => { setVariants({}); setActiveVar(null); setVarKey(k => k + 1) }}
                  className="ml-auto px-2 text-xs font-semibold text-red-400 hover:text-red-600">{t('discard_translations')}</button>
              </div>
              {activeVar && variants[activeVar] && (
                <div className="space-y-2">
                  <input className={inputCls} placeholder={t('field_title')} value={variants[activeVar].title ?? ''}
                    onChange={e => setVariants(v => ({ ...v, [activeVar]: { ...v[activeVar], title: e.target.value } }))} />
                  <RichTextEditor key={`${activeVar}-${varKey}`} minHeight={140} initialHtml={variants[activeVar].bodyHtml}
                    onChange={html => setVariants(v => ({ ...v, [activeVar]: { ...v[activeVar], bodyHtml: html } }))} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Display type */}
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-stone-400 mb-2">{t('display_type')}</p>
          <div className="flex flex-wrap gap-2">
            {ANNOUNCEMENT_DISPLAYS.map(d => (
              <button key={d} type="button" className={chip(displayType === d)} onClick={() => setDisplayType(d)}>
                {t(`type_${d}`)}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-1.5">{t(`type_${displayType}_hint`)}</p>
        </div>

        {/* Placement */}
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-stone-400 mb-2">{t('placement')}</p>
          <div className="flex flex-wrap gap-2">
            {ANNOUNCEMENT_PLACEMENTS.map(p => (
              <button key={p} type="button" className={chip(placement.includes(p))} onClick={() => togglePlacement(p)}>
                {t(`place_${p}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Window + flags */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-stone-400 mb-2">{t('starts_at')}</p>
            <input type="datetime-local" className={inputCls} value={startsAt} onChange={e => setStartsAt(e.target.value)} />
            <p className="text-[11px] text-stone-400 mt-1">{t('starts_hint')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-stone-400 mb-2">{t('ends_at')}</p>
            <input type="datetime-local" className={inputCls} value={endsAt} onChange={e => setEndsAt(e.target.value)} />
            <p className="text-[11px] text-stone-400 mt-1">{t('ends_hint')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-gold" />
            {t('active')}
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input type="checkbox" checked={dismissible} onChange={e => setDismissible(e.target.checked)} className="accent-gold" />
            {t('dismissible')}
          </label>
        </div>

        {msg && <p className={`text-sm font-medium ${msg.kind === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}

        <div className="flex flex-wrap gap-3 pt-1">
          <button type="button" disabled={!canSave} onClick={save}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-gold text-white hover:bg-gold-dark transition-colors disabled:opacity-40">
            {pending ? t('working') : editingId ? t('btn_update') : t('btn_create')}
          </button>
          {editingId && (
            <button type="button" onClick={reset}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-stone-200 text-stone-600 hover:border-stone-300 transition-colors">
              {t('cancel')}
            </button>
          )}
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-base font-bold text-stone-800 mb-4">{t('list_title')}</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-stone-400">{t('empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  <th className="py-2 pr-4">{t('field_title')}</th>
                  <th className="py-2 pr-4">{t('display_type')}</th>
                  <th className="py-2 pr-4">{t('placement')}</th>
                  <th className="py-2 pr-4">{t('window')}</th>
                  <th className="py-2 pr-4">{t('active')}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {announcements.map(a => {
                  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short' }) : '—'
                  return (
                    <tr key={a.id} className="border-b border-stone-50">
                      <td className="py-2.5 pr-4 font-medium text-stone-700 max-w-[240px] truncate">{a.title}</td>
                      <td className="py-2.5 pr-4 text-stone-500">{t(`type_${a.displayType}`)}</td>
                      <td className="py-2.5 pr-4 text-stone-500">{a.placement.map(p => t(`place_${p}`)).join(', ')}</td>
                      <td className="py-2.5 pr-4 text-stone-500 whitespace-nowrap">{fmt(a.startsAt)} → {fmt(a.endsAt)}</td>
                      <td className="py-2.5 pr-4">
                        <button type="button" disabled={pending}
                          onClick={() => startTransition(async () => { await setAnnouncementActive(a.id, !a.active); router.refresh() })}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${a.active ? 'bg-green-50 text-green-600' : 'bg-stone-100 text-stone-500'}`}>
                          {a.active ? t('on') : t('off')}
                        </button>
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button type="button" onClick={() => edit(a)} className="text-xs font-semibold text-stone-500 hover:text-gold-dark">{t('edit')}</button>
                        <button type="button" disabled={pending}
                          onClick={() => { if (confirm(t('confirm_delete'))) startTransition(async () => { await deleteAnnouncement(a.id); router.refresh() }) }}
                          className="ml-3 text-xs font-semibold text-red-400 hover:text-red-600 disabled:opacity-40">{t('delete')}</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
