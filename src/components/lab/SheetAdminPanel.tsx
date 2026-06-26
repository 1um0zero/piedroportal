'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markSent, closeSheet, deleteSheet } from '@/app/actions/lab'

export default function SheetAdminPanel({
  id, status, link, sentAt, openUntil,
}: {
  id: string; status: string; link: string; sentAt: string | null; openUntil: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    try { await fn(); router.refresh() } finally { setBusy(false) }
  }

  function copy() {
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  const closed = status.startsWith('closed_')
  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-PT') : null

  return (
    <div className="bg-white rounded-[14px] p-6 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* Reviewer link */}
      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1.5">Link para o revisor</label>
        <div className="flex gap-2">
          <input readOnly value={link} onFocus={e => e.target.select()}
            className="flex-1 text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-500" />
          <button type="button" onClick={copy}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-stone-800 text-white shrink-0">
            {copied ? 'Copiado ✓' : 'Copiar'}
          </button>
        </div>
        {status === 'sent' && openUntil && (
          <p className="text-xs text-stone-400 mt-1.5">
            Aberto sem login até <strong>{fmt(openUntil)}</strong> (2 dias úteis após o envio {sentAt ? `· enviada ${fmt(sentAt)}` : ''}).
            Depois disso, o link pede sessão.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
        {status === 'draft' && (
          <button type="button" disabled={busy} onClick={() => run(() => markSent(id))}
            className="bg-gold text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
            Marcar como enviada
          </button>
        )}
        {!closed && status !== 'draft' && (
          <>
            <button type="button" disabled={busy} onClick={() => run(() => closeSheet(id, 'implemented'))}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
              Fechar · implementada
            </button>
            <button type="button" disabled={busy} onClick={() => run(() => closeSheet(id, 'cancelled'))}
              className="bg-stone-200 text-stone-700 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
              Fechar · cancelada
            </button>
          </>
        )}
        {status === 'draft' && (
          <button type="button" disabled={busy}
            onClick={() => { if (confirm('Eliminar este rascunho?')) run(async () => { await deleteSheet(id); router.push('/admin/lab') }) }}
            className="ml-auto text-red-400 hover:text-red-500 px-3 py-2 rounded-lg text-sm">
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}
