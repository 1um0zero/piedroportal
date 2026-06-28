'use client'

import { useState } from 'react'
import { LabOption } from '@/lab/components'
import { getLabMeta } from '@/lab/registry'
import { submitResponse, type VerdictInput } from '@/app/actions/lab'

type Verdict = 'chosen' | 'option' | 'rejected' | null
type Opt = { optKey: string; title: string; subtitle: string | null; verdict: Verdict; comment: string | null }

const VERDICTS: { key: Exclude<Verdict, null>; label: string; active: string }[] = [
  { key: 'chosen',   label: 'Escolhido', active: 'border-gold bg-gold/10 text-gold' },
  { key: 'option',   label: 'Opção',     active: 'border-stone-400 bg-stone-100 text-stone-700' },
  { key: 'rejected', label: 'Recusado',  active: 'border-red-300 bg-red-50 text-red-500' },
]

export default function ApprovalSheetForm({
  token, labKey, options, closed, answered, overallComment, preview = false,
}: {
  token: string; labKey: string; options: Opt[]
  closed: boolean; answered: boolean; overallComment: string | null
  /** Preview mode (admin): widgets interactive, but no submit and no server writes. */
  preview?: boolean
}) {
  const meta = getLabMeta(labKey)
  const noteFor = (k: string) => meta?.options.find(o => o.key === k)?.note
  const readOnly = closed

  const [state, setState] = useState<Record<string, { verdict: Verdict; comment: string }>>(
    () => Object.fromEntries(options.map(o => [o.optKey, { verdict: o.verdict, comment: o.comment ?? '' }]))
  )
  const [overall, setOverall] = useState(overallComment ?? '')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(answered)
  const [error, setError] = useState<string | null>(null)

  function setVerdict(k: string, v: Exclude<Verdict, null>) {
    setState(s => ({ ...s, [k]: { ...s[k], verdict: s[k].verdict === v ? null : v } }))
  }
  function setComment(k: string, c: string) {
    setState(s => ({ ...s, [k]: { ...s[k], comment: c } }))
  }

  async function submit() {
    setSaving(true); setError(null)
    try {
      const verdicts: VerdictInput[] = options.map(o => ({
        optKey: o.optKey, verdict: state[o.optKey].verdict, comment: state[o.optKey].comment,
      }))
      await submitResponse({ token, verdicts, overallComment: overall })
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao submeter')
    } finally {
      setSaving(false)
    }
  }

  if (done && !readOnly) {
    return (
      <div className="bg-white rounded-[14px] p-8 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="w-12 h-12 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h2 className="text-lg font-semibold text-stone-800 mb-1">Resposta enviada</h2>
        <p className="text-sm text-stone-500">Obrigado. As suas escolhas foram registadas e a equipa foi notificada.
          Pode fechar esta página — ou rever as respostas abaixo recarregando o link.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {closed && (
        <div className="bg-stone-800 text-stone-100 rounded-[14px] px-5 py-3 text-sm">
          Esta folha está fechada. Apresentada apenas para consulta.
        </div>
      )}

      {options.map(o => {
        const cur = state[o.optKey]
        const note = noteFor(o.optKey)
        return (
          <section key={o.optKey} className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
            <h2 className="text-sm font-semibold text-stone-800">{o.title}</h2>
            {o.subtitle && <p className="text-xs text-stone-500">{o.subtitle}</p>}
            {note && <p className="text-xs text-stone-500 mt-1 mb-3 leading-relaxed">{note}</p>}

            <div className="border-t border-stone-100 pt-4 pb-1"><LabOption labKey={labKey} optKey={o.optKey} /></div>

            <div className="mt-4 flex flex-wrap gap-2">
              {VERDICTS.map(v => {
                const on = cur.verdict === v.key
                return (
                  <button key={v.key} type="button" disabled={readOnly}
                    onClick={() => setVerdict(o.optKey, v.key)}
                    className={`px-4 py-1.5 rounded-full border text-xs font-semibold transition-all disabled:opacity-60
                      ${on ? v.active : 'border-stone-200 text-stone-400 hover:border-stone-300'}`}>
                    {v.label}
                  </button>
                )
              })}
            </div>

            <textarea
              value={cur.comment} disabled={readOnly}
              onChange={e => setComment(o.optKey, e.target.value)}
              placeholder="Comentário (opcional)…"
              rows={2}
              className="mt-3 w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold disabled:opacity-70 resize-y"
            />
          </section>
        )
      })}

      <section className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <label className="text-sm font-semibold text-stone-800">Comentário geral</label>
        <textarea
          value={overall} disabled={readOnly}
          onChange={e => setOverall(e.target.value)}
          placeholder="Algo a acrescentar sobre o conjunto…"
          rows={3}
          className="mt-2 w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold disabled:opacity-70 resize-y"
        />
      </section>

      {preview && (
        <p className="text-center text-xs text-stone-400">Pré-visualização — nada é guardado neste modo.</p>
      )}

      {!readOnly && !preview && (
        <div className="flex items-center justify-between gap-4 pt-1">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="button" onClick={submit} disabled={saving}
            className="ml-auto bg-gold text-white px-8 py-3 rounded-lg text-sm font-semibold disabled:opacity-60">
            {saving ? 'A enviar…' : done ? 'Reenviar resposta' : 'Enviar resposta'}
          </button>
        </div>
      )}
    </div>
  )
}
