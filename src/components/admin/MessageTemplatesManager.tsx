'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { renderTemplate } from '@/messaging/render'
import { MESSAGING_CONFIG } from '@/messaging/config'
import type { MessageTemplate, TemplateVariant } from '@/messaging/types'
import { saveTemplate, deleteTemplate, duplicateTemplate, translateTemplate } from '@/app/actions/message-templates'

/**
 * /admin/message-templates configurator. Left: the template library. Right: an
 * editor (subject + rich body + optional signature + per-locale variants) with
 * a live branded preview. Templates saved here are reused by the broadcast tool
 * and by any feature that calls sendTemplateEmail(key, …).
 */

const LOCALES = MESSAGING_CONFIG.locales
type Draft = {
  id?: string
  key: string
  name: string
  category: string
  description: string
  subject: string
  bodyHtml: string
  signatureHtml: string
  translations: Record<string, TemplateVariant>
  active: boolean
}

const EMPTY: Draft = {
  key: '', name: '', category: '', description: '', subject: '',
  bodyHtml: '<p>Hello {{name}},</p><p><br/></p>', signatureHtml: '', translations: {}, active: true,
}

function toDraft(t: MessageTemplate): Draft {
  return {
    id: t.id, key: t.key, name: t.name, category: t.category ?? '', description: t.description ?? '',
    subject: t.subject, bodyHtml: t.body_html, signatureHtml: t.signature_html ?? '',
    translations: t.translations ?? {}, active: t.active,
  }
}

export default function MessageTemplatesManager({ templates }: { templates: MessageTemplate[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null)
  const [draft, setDraft] = useState<Draft>(templates[0] ? toDraft(templates[0]) : EMPTY)
  const [editorKey, setEditorKey] = useState(0)
  const [previewLocale, setPreviewLocale] = useState<string>(LOCALES[0])
  const [srcLocale, setSrcLocale] = useState<string>(LOCALES[0])
  const [activeVar, setActiveVar] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => ({ ...d, [k]: v }))

  function select(t: MessageTemplate | null) {
    setMsg(null)
    setActiveVar(null)
    if (!t) { setSelectedId(null); setDraft({ ...EMPTY }) }
    else { setSelectedId(t.id); setDraft(toDraft(t)) }
    setEditorKey(k => k + 1)
  }

  // Variables the template uses, for the hint + preview sample values.
  const detectedVars = useMemo(() => {
    const set = new Set<string>()
    const scan = [draft.subject, draft.bodyHtml,
      ...Object.values(draft.translations).flatMap(v => [v.subject, v.body_html])]
    for (const s of scan) for (const m of s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) set.add(m[1])
    return [...set]
  }, [draft.subject, draft.bodyHtml, draft.translations])

  const sampleVars = useMemo(() => {
    const v: Record<string, string> = {}
    for (const name of detectedVars) v[name] = name === 'name' ? 'Alex Morgan' : `«${name}»`
    return v
  }, [detectedVars])

  const preview = useMemo(() => renderTemplate(
    { subject: draft.subject, body_html: draft.bodyHtml, signature_html: draft.signatureHtml || null, translations: draft.translations },
    { locale: previewLocale, vars: sampleVars, contactEmail: MESSAGING_CONFIG.settingsKeys.replyTo },
  ), [draft, previewLocale, sampleVars])

  const targetLocales = LOCALES.filter(l => l !== srcLocale)

  function save() {
    setMsg(null)
    startTransition(async () => {
      const r = await saveTemplate({
        id: draft.id, key: draft.key, name: draft.name, category: draft.category,
        description: draft.description, subject: draft.subject, bodyHtml: draft.bodyHtml,
        signatureHtml: draft.signatureHtml || null,
        translations: Object.keys(draft.translations).length ? draft.translations : null,
        active: draft.active,
      })
      if (r.error) { setMsg({ kind: 'err', text: r.error }); return }
      setMsg({ kind: 'ok', text: 'Saved.' })
      if (r.id && !draft.id) setDraft(d => ({ ...d, id: r.id }))
      router.refresh()
    })
  }

  function remove() {
    if (!draft.id || !confirm('Delete this template?')) return
    startTransition(async () => {
      const r = await deleteTemplate(draft.id!)
      if (r.error) { setMsg({ kind: 'err', text: r.error }); return }
      select(null)
      router.refresh()
    })
  }

  function duplicate() {
    if (!draft.id) return
    startTransition(async () => {
      const r = await duplicateTemplate(draft.id!)
      if (r.error) setMsg({ kind: 'err', text: r.error })
      else { setMsg({ kind: 'ok', text: 'Duplicated.' }); router.refresh() }
    })
  }

  function translate() {
    setMsg(null); setTranslating(true)
    startTransition(async () => {
      const r = await translateTemplate(draft.subject, draft.bodyHtml, srcLocale, targetLocales)
      setTranslating(false)
      if (r.error || !r.translations) { setMsg({ kind: 'err', text: r.error ?? 'Translation failed' }); return }
      set('translations', { ...draft.translations, ...r.translations })
      setActiveVar(Object.keys(r.translations)[0] ?? null)
      setMsg({ kind: 'ok', text: `Translations ready: ${Object.keys(r.translations).join(', ').toUpperCase()}` })
    })
  }

  const inputCls = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Message templates</h1>
        <p className="text-sm text-stone-500 mt-1">
          Reusable subject + body + signature blocks, with per-language variants and{' '}
          <code className="text-gold-dark">{'{{'}variable{'}}'}</code> placeholders. Used by the broadcast tool and by
          any feature that sends templated emails.
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* ── Library ─────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <button type="button" onClick={() => select(null)}
            className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-white hover:bg-gold-dark transition-colors">
            + New template
          </button>
          <div className="bg-white rounded-[14px] p-2" style={{ boxShadow: 'var(--shadow-card)' }}>
            {templates.length === 0 ? (
              <p className="text-sm text-stone-400 p-3">No templates yet.</p>
            ) : templates.map(t => (
              <button key={t.id} type="button" onClick={() => select(t)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedId === t.id ? 'bg-stone-100' : 'hover:bg-stone-50'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-700 truncate">{t.name}</span>
                  {!t.active && <span className="text-[10px] uppercase font-bold text-stone-400">off</span>}
                </div>
                <div className="text-[11px] text-stone-400 font-mono truncate">{t.key}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Editor + preview ────────────────────────────────────────────── */}
        <div className="grid xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Name</span>
                <input className={inputCls} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Order confirmation" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Key (slug)</span>
                <input className={`${inputCls} font-mono`} value={draft.key} onChange={e => set('key', e.target.value)} placeholder="order_confirmation" />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Category</span>
                <input className={inputCls} value={draft.category} onChange={e => set('category', e.target.value)} placeholder="Transactional" />
              </label>
              <label className="flex items-end gap-2 pb-2">
                <input type="checkbox" checked={draft.active} onChange={e => set('active', e.target.checked)} className="accent-gold" />
                <span className="text-sm text-stone-600">Active</span>
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Description</span>
              <input className={inputCls} value={draft.description} onChange={e => set('description', e.target.value)} placeholder="When and how this template is used" />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Subject</span>
              <input className={inputCls} value={draft.subject} onChange={e => set('subject', e.target.value)} placeholder="Your order {{order_no}} is confirmed" />
            </label>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Body</span>
              <RichTextEditor key={`body-${editorKey}`} initialHtml={draft.bodyHtml} onChange={h => set('bodyHtml', h)} />
            </div>

            {detectedVars.length > 0 && (
              <p className="text-xs text-stone-500">
                Variables:{' '}
                {detectedVars.map(v => <code key={v} className="mr-1 rounded bg-stone-100 px-1.5 py-0.5 text-gold-dark">{`{{${v}}}`}</code>)}
              </p>
            )}

            <details className="border border-dashed border-stone-200 rounded-lg p-3">
              <summary className="text-xs font-semibold uppercase tracking-wider text-stone-400 cursor-pointer">
                Signature override (optional)
              </summary>
              <div className="mt-2">
                <RichTextEditor key={`sig-${editorKey}`} initialHtml={draft.signatureHtml} minHeight={90}
                  onChange={h => set('signatureHtml', h)} placeholder="Leave empty to use the shared broadcast signature" />
              </div>
            </details>

            {/* Per-language variants */}
            <div className="border border-dashed border-stone-200 rounded-lg p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Translations</span>
                <label className="ml-auto flex items-center gap-1.5 text-xs text-stone-500">
                  Original
                  <select className="border border-stone-200 rounded px-1.5 py-1 text-xs uppercase" value={srcLocale} onChange={e => setSrcLocale(e.target.value)}>
                    {LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                  </select>
                </label>
                <button type="button" disabled={!draft.subject.trim() || pending || translating} onClick={translate}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold/10 text-gold-dark hover:bg-gold/20 transition-colors disabled:opacity-40">
                  {translating ? 'Translating…' : `AI translate → ${targetLocales.join(', ').toUpperCase()}`}
                </button>
              </div>
              {Object.keys(draft.translations).length > 0 && (
                <div className="space-y-2">
                  <div className="flex gap-1 flex-wrap">
                    {Object.keys(draft.translations).map(l => (
                      <button key={l} type="button" onClick={() => setActiveVar(l)}
                        className={`px-3 py-1.5 rounded-t-lg text-xs font-bold uppercase border-b-2 transition-colors ${activeVar === l ? 'border-gold text-gold-dark' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
                        {l}
                      </button>
                    ))}
                    <button type="button" onClick={() => { set('translations', {}); setActiveVar(null) }}
                      className="ml-auto px-2 text-xs font-semibold text-red-400 hover:text-red-600">Discard</button>
                  </div>
                  {activeVar && draft.translations[activeVar] && (
                    <div className="space-y-2">
                      <input className={inputCls} value={draft.translations[activeVar].subject}
                        onChange={e => set('translations', { ...draft.translations, [activeVar]: { ...draft.translations[activeVar], subject: e.target.value } })} />
                      <RichTextEditor key={`tr-${activeVar}-${editorKey}`} minHeight={140} initialHtml={draft.translations[activeVar].body_html}
                        onChange={h => set('translations', { ...draft.translations, [activeVar]: { ...draft.translations[activeVar], body_html: h } })} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg && <p className={`text-sm font-medium ${msg.kind === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}

            <div className="flex flex-wrap gap-3 pt-1">
              <button type="button" disabled={pending} onClick={save}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-gold text-white hover:bg-gold-dark transition-colors disabled:opacity-40">
                {pending ? 'Working…' : 'Save template'}
              </button>
              {draft.id && (
                <>
                  <button type="button" disabled={pending} onClick={duplicate}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-stone-200 text-stone-600 hover:border-gold hover:text-gold-dark transition-colors disabled:opacity-40">
                    Duplicate
                  </button>
                  <button type="button" disabled={pending} onClick={remove}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40">
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-[14px] p-6 space-y-3 self-start" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Preview</span>
              <div className="flex gap-1">
                {LOCALES.map(l => (
                  <button key={l} type="button" onClick={() => setPreviewLocale(l)}
                    className={`px-2 py-1 rounded text-xs font-bold uppercase ${previewLocale === l ? 'bg-gold text-white' : 'text-stone-400 hover:text-stone-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm font-semibold text-stone-700 break-words border-b border-stone-100 pb-2">{preview.subject || <span className="text-stone-300">No subject</span>}</p>
            <div className="text-sm text-stone-700 [&_img]:max-w-full [&_img]:h-auto [&_a]:text-gold-dark"
              dangerouslySetInnerHTML={{ __html: preview.html }} />
          </div>
        </div>
      </div>
    </div>
  )
}
