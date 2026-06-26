'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSheet } from '@/app/actions/lab'

type Lab = { key: string; title: string; intro: string; count: number }

export default function NewSheetForm({ labs }: { labs: Lab[] }) {
  const router = useRouter()
  const [labKey, setLabKey] = useState(labs[0]?.key ?? '')
  const [title, setTitle] = useState('')
  const [intro, setIntro] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [reviewerEmail, setReviewerEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lab = labs.find(l => l.key === labKey)

  async function submit() {
    setSaving(true); setError(null)
    try {
      const { id } = await createSheet({ labKey, title, intro, reviewerName, reviewerEmail })
      router.push(`/admin/lab/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
      setSaving(false)
    }
  }

  const field = 'w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold'

  return (
    <div className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1.5">Conjunto de alternativas (lab)</label>
        <select value={labKey} onChange={e => setLabKey(e.target.value)} className={field}>
          {labs.map(l => <option key={l.key} value={l.key}>{l.title} ({l.count} alternativas)</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1.5">Título <span className="text-stone-300 font-normal">(vazio = usa o do lab)</span></label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={lab?.title} className={field} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1.5">Introdução para o revisor <span className="text-stone-300 font-normal">(vazio = usa a do lab)</span></label>
        <textarea value={intro} onChange={e => setIntro(e.target.value)} rows={3} placeholder={lab?.intro} className={`${field} resize-y`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">Nome do revisor</label>
          <input value={reviewerName} onChange={e => setReviewerName(e.target.value)} placeholder="Anabela" className={field} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">Email do revisor</label>
          <input value={reviewerEmail} onChange={e => setReviewerEmail(e.target.value)} placeholder="alopes@piedro.pt" className={field} />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="button" onClick={submit} disabled={saving || !labKey}
        className="w-full bg-gold text-white py-3 rounded-lg text-sm font-semibold disabled:opacity-60">
        {saving ? 'A criar…' : 'Criar rascunho'}
      </button>
    </div>
  )
}
