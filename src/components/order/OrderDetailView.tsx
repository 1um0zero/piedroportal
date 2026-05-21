'use client'

import { useState, useTransition } from 'react'
import { useRouter } from '@/i18n/navigation'
import { SECTIONS } from './additions-config'
import { updateOrderAdminAction, translateTextAction } from '@/app/actions/admin-orders'

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', in_review: 'Em Análise',
  approved: 'Approved', in_production: 'In Production',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
}
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-500', submitted: 'bg-blue-50 text-blue-600',
  in_review: 'bg-yellow-50 text-yellow-700', approved: 'bg-green-50 text-green-600',
  in_production: 'bg-amber-50 text-amber-600', shipped: 'bg-purple-50 text-purple-600',
  delivered: 'bg-teal-50 text-teal-600', cancelled: 'bg-red-50 text-red-400',
}
const STATUS_NEXT: Record<string, { label: string; value: string; color: string }[]> = {
  submitted:  [{ label: 'Em Análise', value: 'in_review', color: 'bg-yellow-500' }, { label: 'Approve', value: 'approved', color: 'bg-green-600' }, { label: 'Reject', value: 'cancelled', color: 'bg-red-500' }],
  in_review:  [{ label: 'Approve', value: 'approved', color: 'bg-green-600' }, { label: 'Reject', value: 'cancelled', color: 'bg-red-500' }],
  approved:   [{ label: 'In Production', value: 'in_production', color: 'bg-amber-600' }],
  in_production: [{ label: 'Shipped', value: 'shipped', color: 'bg-purple-600' }],
  shipped:    [{ label: 'Delivered', value: 'delivered', color: 'bg-teal-600' }],
}
const UNIT_LABEL: Record<string, string> = {
  PAIR: 'Pair (L=R)', LEFT: 'Left only', RIGHT: 'Right only', LEFT_RIGHT: 'L ≠ R', DIFF_SIZES: 'Different sizes',
}

type SidedVal = { l: unknown; r: unknown }

function formatSide(l: unknown, r: unknown, unit: string) {
  if (unit === 'LEFT_RIGHT') return `L: ${l ?? '—'}  R: ${r ?? '—'}`
  if (unit === 'RIGHT') return String(r ?? '—')
  return String(l ?? '—')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function OrderDetailView({ order, isAdmin }: { order: any; isAdmin: boolean }) {
  const router = useRouter()
  const [, start] = useTransition()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product = (Array.isArray(order.products) ? order.products[0] : order.products) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const company = (Array.isArray(order.companies) ? order.companies[0] : order.companies) as any

  const [piedroId, setPiedroId] = useState(order.piedro_order_id ?? '')
  const [piedroNotes, setPiedroNotes] = useState(order.piedro_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const [translation, setTranslation] = useState('')
  const [translating, setTranslating] = useState(false)
  const [translateLang, setTranslateLang] = useState<'en' | 'pt'>('en')

  const unit = order.unit ?? 'PAIR'

  // Additions formatted for display
  const adds = order.additions as Record<string, unknown> | null
  const addSections = SECTIONS.map(sec => {
    const filled = sec.fields.flatMap(f => {
      if (f.side === 'global') {
        return adds?.[f.key] === true ? [{ label: f.label.replace(/\s*\(mm\)/gi, ''), value: 'Yes' }] : []
      }
      const sv = adds?.[f.key] as SidedVal | null
      const hasL = sv?.l != null && sv.l !== '' && sv.l !== false
      const hasR = sv?.r != null && sv.r !== '' && sv.r !== false
      if (!hasL && !hasR) return []
      const label = f.label.replace(/↳\s*/g, '  · ').replace(/\s*\(mm\)/gi, '')
      const value = unit === 'LEFT_RIGHT'
        ? `L: ${hasL ? sv!.l : '—'}  R: ${hasR ? sv!.r : '—'}`
        : String(hasL ? sv!.l : sv!.r)
      return [{ label, value }]
    })
    return { section: sec.label, filled }
  }).filter(s => s.filled.length > 0)

  async function handleStatus(newStatus: string) {
    setSaving(true)
    const result = await updateOrderAdminAction(order.id, { status: newStatus })
    setSaving(false)
    if (result.ok) { setSavedMsg(`Status → ${STATUS_LABEL[newStatus]}`); router.refresh() }
    else setSavedMsg(`Error: ${result.error}`)
  }

  async function handleSavePiedro() {
    setSaving(true)
    const result = await updateOrderAdminAction(order.id, { piedro_order_id: piedroId, piedro_notes: piedroNotes })
    setSaving(false)
    setSavedMsg(result.ok ? 'Saved' : `Error: ${result.error}`)
  }

  async function handleTranslate() {
    setTranslating(true)
    const text = [order.comments, order.clinician && `Clinician: ${order.clinician}`, order.patient_name && `Patient: ${order.patient_name}`].filter(Boolean).join('\n')
    const result = await translateTextAction(text, translateLang)
    setTranslation(result.translation ?? result.error ?? '')
    setTranslating(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-stone-400 mb-1">Order</p>
          <h1 className="text-2xl font-bold text-stone-900">{order.reference_customer ?? '—'}</h1>
          <p className="text-sm text-stone-500 mt-0.5">{new Date(order.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${STATUS_BADGE[order.status] ?? 'bg-stone-100 text-stone-500'}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
          {order.pdf_url && (
            <a href={order.pdf_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gold border border-gold/40 rounded-lg hover:bg-gold/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
              </svg>
              PDF
            </a>
          )}
        </div>
      </div>

      {savedMsg && (
        <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{savedMsg}</div>
      )}

      {/* Admin controls */}
      {isAdmin && (
        <div className="bg-white rounded-[14px] p-5 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Piedro Admin</h2>

          {/* Status actions */}
          {STATUS_NEXT[order.status] && (
            <div className="flex flex-wrap gap-2">
              {STATUS_NEXT[order.status].map(action => (
                <button key={action.value} disabled={saving} onClick={() => handleStatus(action.value)}
                  className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-opacity disabled:opacity-50 ${action.color}`}>
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Piedro Order ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Piedro Order #</label>
              <input value={piedroId} onChange={e => setPiedroId(e.target.value)}
                placeholder="e.g. PO-2024-001234"
                className="w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Internal Notes</label>
              <input value={piedroNotes} onChange={e => setPiedroNotes(e.target.value)}
                placeholder="Production notes…"
                className="w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
            </div>
          </div>
          <button onClick={handleSavePiedro} disabled={saving}
            className="px-5 py-2 bg-stone-800 text-white text-sm font-semibold rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {/* Customer + Product */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-[14px] p-5 space-y-2" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Customer</h2>
          <p className="font-semibold text-stone-900">{company?.name ?? '—'}</p>
          {order.clinician   && <p className="text-xs text-stone-500">Clinician: {order.clinician}</p>}
          {order.patient_name && <p className="text-xs text-stone-500">Patient: {order.patient_name}</p>}
          <p className="text-xs text-stone-400">{UNIT_LABEL[unit] ?? unit} · Qty {order.quantity}</p>
        </div>
        <div className="bg-white rounded-[14px] p-5 space-y-2" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Product</h2>
          <div className="flex items-center gap-3">
            {product?.picture_name && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${BUCKET}/${product.picture_name}`} alt="" className="w-12 h-12 object-contain" />
            )}
            <div>
              <p className="font-bold text-stone-900">{product?.colour_id ?? '—'}</p>
              <p className="text-xs text-stone-500">{product?.color_name} · {product?.closure}</p>
            </div>
          </div>
          {(order.construction_left || order.construction_right) && (
            <p className="text-xs text-stone-400">Construction: {formatSide(order.construction_left, order.construction_right, unit)}</p>
          )}
          {(order.width_left || order.width_right) && (
            <p className="text-xs text-stone-400">Width: {formatSide(order.width_left, order.width_right, unit)}</p>
          )}
          {(order.size_left || order.size_right) && (
            <p className="text-xs text-stone-400">Size EU: {formatSide(order.size_left, order.size_right, unit)}</p>
          )}
        </div>
      </div>

      {/* Comments + translation */}
      {(order.comments || isAdmin) && (
        <div className="bg-white rounded-[14px] p-5 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Comments</h2>
          {order.comments ? (
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{order.comments}</p>
          ) : (
            <p className="text-sm text-stone-400 italic">No comments</p>
          )}

          {isAdmin && order.comments && (
            <div className="pt-2 border-t border-stone-50 space-y-2">
              <div className="flex items-center gap-2">
                <button onClick={() => { setTranslateLang('en'); start(handleTranslate) }} disabled={translating}
                  className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors disabled:opacity-50">
                  {translating && translateLang === 'en' ? 'Translating…' : '🇬🇧 Translate to EN'}
                </button>
                <button onClick={() => { setTranslateLang('pt'); start(handleTranslate) }} disabled={translating}
                  className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors disabled:opacity-50">
                  {translating && translateLang === 'pt' ? 'Translating…' : '🇵🇹 Translate to PT'}
                </button>
              </div>
              {translation && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide mb-1">
                    Translation ({translateLang.toUpperCase()})
                  </p>
                  <p className="text-sm text-blue-900 whitespace-pre-wrap">{translation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Additions detail */}
      {addSections.length > 0 && (
        <div className="bg-white rounded-[14px] p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-4">Additions</h2>
          <div className="space-y-4">
            {addSections.map(sec => (
              <div key={sec.section}>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">{sec.section}</p>
                <div className="divide-y divide-stone-50">
                  {sec.filled.map((f, i) => (
                    <div key={i} className="flex items-baseline justify-between py-1.5 gap-4">
                      <span className="text-xs text-stone-500">{f.label}</span>
                      <span className="text-xs font-semibold text-stone-800 shrink-0">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
