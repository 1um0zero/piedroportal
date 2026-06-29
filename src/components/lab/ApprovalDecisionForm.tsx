'use client'

// Single-subject approval form (lab kind 'approval'). Shows the captured subject
// (e.g. a painted maquette) read-only, then ONE verdict — Aprovado / Rejeitado /
// Em discussão — plus a comment. Drives both paths:
//   • reviewer (token link)  → pass `token`
//   • internal admin in-app  → pass `sheetId`

import { useState } from 'react'
import { APPROVAL_VERDICTS, type ApprovalVerdict } from '@/lab/registry'
import { submitApproval } from '@/app/actions/lab'
import MaqueteLeatherPicker from '@/components/custom/MaqueteLeatherPicker'

type Maquete = { id: string; image: string; viewBox: string; silhouette?: string; zones: { id: string; name: string; points: string }[] }
type LeatherProposal = { maquete: Maquete; leathers: { id: number; src: string; name: string }[]; assign: Record<string, number> }

export default function ApprovalDecisionForm({
  token, sheetId, subjectData, verdict, comment, closed, answered, preview = false,
}: {
  token?: string
  sheetId?: string
  subjectData: unknown
  verdict: ApprovalVerdict | null
  comment: string | null
  closed: boolean
  answered: boolean
  /** Preview mode (admin): interactive but no server writes. */
  preview?: boolean
}) {
  const proposal = subjectData as LeatherProposal | null
  const readOnly = closed
  const [pick, setPick] = useState<ApprovalVerdict | null>(verdict)
  const [note, setNote] = useState(comment ?? '')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(answered)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!pick) { setError('Escolha um veredicto.'); return }
    setSaving(true); setError(null)
    try {
      await submitApproval({ token, sheetId, verdict: pick, comment: note })
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao submeter')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {closed && (
        <div className="bg-stone-800 text-stone-100 rounded-[14px] px-5 py-3 text-sm">
          Esta folha está fechada. Apresentada apenas para consulta.
        </div>
      )}

      <section className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        {proposal
          ? <MaqueteLeatherPicker
              leathers={proposal.leathers}
              maquete={proposal.maquete}
              initialAssign={proposal.assign}
              readOnly />
          : <p className="text-sm text-stone-400">— sem pré-visualização do assunto —</p>}
      </section>

      <section className="bg-white rounded-[14px] p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h2 className="text-sm font-semibold text-stone-800 mb-3">Veredicto</h2>
        <div className="flex flex-wrap gap-2">
          {APPROVAL_VERDICTS.map(v => {
            const on = pick === v.key
            return (
              <button key={v.key} type="button" disabled={readOnly}
                onClick={() => setPick(on ? null : v.key)}
                className={`px-5 py-2 rounded-full border text-sm font-semibold transition-all disabled:opacity-60
                  ${on ? v.cls : 'border-stone-200 text-stone-400 hover:border-stone-300'}`}>
                {v.label}
              </button>
            )
          })}
        </div>
        <textarea
          value={note} disabled={readOnly}
          onChange={e => setNote(e.target.value)}
          placeholder="Comentário (opcional)…"
          rows={3}
          className="mt-4 w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold disabled:opacity-70 resize-y"
        />
      </section>

      {preview && (
        <p className="text-center text-xs text-stone-400">Pré-visualização — nada é guardado neste modo.</p>
      )}

      {done && !readOnly && (
        <div className="bg-gold/5 border border-gold/20 rounded-[14px] px-5 py-3 text-sm text-gold">
          Resposta registada{pick ? ` — ${APPROVAL_VERDICTS.find(v => v.key === pick)?.label}` : ''}. A equipa foi notificada.
        </div>
      )}

      {!readOnly && !preview && (
        <div className="flex items-center justify-between gap-4 pt-1">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="button" onClick={submit} disabled={saving}
            className="ml-auto bg-gold text-white px-8 py-3 rounded-lg text-sm font-semibold disabled:opacity-60">
            {saving ? 'A enviar…' : done ? 'Atualizar resposta' : 'Submeter veredicto'}
          </button>
        </div>
      )}
    </div>
  )
}
