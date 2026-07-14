'use client'

import { useMemo, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import AdditionsForm from './AdditionsForm'
import { SECTIONS, emptyAdditions, type AdditionField } from './additions-config'
import { soleProfileFor } from './sole-profiles'
import { zsmGroupFor } from './zsm-profiles'
import { getFieldLabel, getSectionLabel, translateOptionValue } from '@/lib/additions-helpers'
import { computeOverridePatch, classifyOverride, hasOverride } from '@/lib/additions-override'
import { updateOrderAdditionsOverrideAction } from '@/app/actions/admin-orders'

type Additions = Record<string, unknown>
type SidedVal = { l?: unknown; r?: unknown }

const FIELD_BY_KEY: Record<string, AdditionField> = Object.fromEntries(
  SECTIONS.flatMap(s => s.fields).map(f => [f.key, f]),
)

const has = (v: unknown) => v != null && v !== '' && v !== false

/** One display row derived from the override, per section, unit-aware. */
type Row = { sectionKey: string; fieldKey: string; label: string; l: string | null; r: string | null; both: string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Product = any

export default function PiedroAdditionsLayer({
  order, product, unit, canEdit,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any
  product: Product
  unit: string
  canEdit: boolean
}) {
  const t = useTranslations('order')
  const tAdd = useTranslations('additions')
  const router = useRouter()
  const [saving, startSaving] = useTransition()
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')

  const clientAdditions = (order.additions ?? null) as Additions | null
  const override = (order.additions_override ?? null) as Additions | null
  const isDouble = unit === 'LEFT_RIGHT'

  // Format a single field value for display (mm suffix, option translation, …).
  function fmt(field: AdditionField, value: unknown): string {
    if (value == null || value === '' || value === false) return ''
    if (field.type === 'toggle') return t('piedro_layer.yes')
    if (field.type === 'mm') return `${value} mm`
    return translateOptionValue(field.key, String(value), tAdd)
  }

  // Build the read-only summary rows from the override patch.
  const rows: Row[] = useMemo(() => {
    if (!hasOverride(override)) return []
    const out: Row[] = []
    for (const section of SECTIONS) {
      for (const field of section.fields) {
        const raw = override![field.key]
        if (raw === undefined) continue
        const label = getFieldLabel(field, tAdd).replace(/↳\s*/g, '').replace(/\s*\(mm\)/gi, '').trim()
        if (field.side === 'global') {
          if (raw === true) out.push({ sectionKey: section.key, fieldKey: field.key, label, l: null, r: null, both: t('piedro_layer.yes') })
          continue
        }
        const sv = raw as SidedVal
        if (isDouble) {
          const l = has(sv?.l) ? fmt(field, sv.l) : null
          const r = has(sv?.r) ? fmt(field, sv.r) : null
          if (l || r) out.push({ sectionKey: section.key, fieldKey: field.key, label, l, r, both: null })
        } else {
          const v = has(sv?.l) ? sv.l : has(sv?.r) ? sv.r : null
          if (v != null) out.push({ sectionKey: section.key, fieldKey: field.key, label, l: null, r: null, both: fmt(field, v) })
        }
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override, isDouble])

  const editedByLabel = order.additions_override_at
    ? new Date(order.additions_override_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  async function handleClear() {
    setErr('')
    startSaving(async () => {
      const res = await updateOrderAdditionsOverrideAction(order.id, null)
      if (res.error) { setErr(res.error); return }
      router.refresh()
    })
  }

  const active = hasOverride(override)

  return (
    <div className="bg-white rounded-[14px] p-5 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-2 py-0.5 rounded-full">
              {t('piedro_layer.badge')}
            </span>
            <h3 className="text-sm font-bold text-stone-800">{t('piedro_layer.title')}</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-xl leading-relaxed">{t('piedro_layer.subtitle')}</p>
        </div>
        {canEdit && (
          <button onClick={() => { setErr(''); setOpen(true) }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gold border border-gold/40 rounded-lg hover:bg-gold/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/>
            </svg>
            {active ? t('piedro_layer.edit_btn') : t('piedro_layer.adjust_btn')}
          </button>
        )}
      </div>

      {err && <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">{err}</div>}

      {!active ? (
        <p className="text-sm text-stone-400 italic">{t('piedro_layer.none')}</p>
      ) : (
        <div className="space-y-3">
          {SECTIONS.filter(s => rows.some(r => r.sectionKey === s.key)).map(section => (
            <div key={section.key}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gold mb-1">{getSectionLabel(section, tAdd)}</p>
              <div className="space-y-1">
                {rows.filter(r => r.sectionKey === section.key).map(r => (
                  <div key={r.fieldKey} className="flex items-baseline justify-between gap-4 text-sm border-b border-stone-50 last:border-0 py-1">
                    <span className="text-stone-600">{r.label}</span>
                    {isDouble ? (
                      <span className="flex gap-4 tabular-nums text-stone-800 font-medium">
                        <span className="text-right"><span className="text-[10px] text-stone-400 mr-1">L</span>{r.l ?? '—'}</span>
                        <span className="text-right"><span className="text-[10px] text-stone-400 mr-1">R</span>{r.r ?? '—'}</span>
                      </span>
                    ) : (
                      <span className="tabular-nums text-stone-800 font-medium text-right">{r.both}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-stone-400">
              {editedByLabel ? t('piedro_layer.edited_on', { date: editedByLabel }) : ''}
              {order.additions_override_note ? ` · ${order.additions_override_note}` : ''}
            </p>
            {canEdit && (
              <button onClick={handleClear} disabled={saving}
                className="text-[11px] font-medium text-red-500 hover:text-red-600 disabled:opacity-50">
                {t('piedro_layer.clear_btn')}
              </button>
            )}
          </div>
        </div>
      )}

      {open && (
        <PiedroAdditionsEditor
          order={order} product={product} unit={unit}
          clientAdditions={clientAdditions} override={override}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); router.refresh() }}
        />
      )}
    </div>
  )
}

// ── Editor modal ──────────────────────────────────────────────────────────────
function PiedroAdditionsEditor({
  order, product, unit, clientAdditions, override, onClose, onSaved,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any
  product: Product
  unit: string
  clientAdditions: Additions | null
  override: Additions | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations('order')
  const tAdd = useTranslations('additions')
  const [saving, startSaving] = useTransition()
  const [err, setErr] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [note, setNote] = useState<string>(order.additions_override_note ?? '')

  // Seed the form with the effective additions so staff edit on top of what the
  // client submitted (and any prior override).
  const [edited, setEdited] = useState<Additions>(() => ({
    ...emptyAdditions(),
    ...(clientAdditions ?? {}),
    ...(override ?? {}),
  }))

  const patch = useMemo(() => computeOverridePatch(clientAdditions, edited), [clientAdditions, edited])
  const changes = useMemo(() => classifyOverride(clientAdditions, patch), [clientAdditions, patch])
  const contradictions = changes.filter(c => c.contradiction)

  const soleProfile = soleProfileFor(product?.style_name)
  const zsmGroup = zsmGroupFor(product?.style_name)

  function labelOf(key: string): string {
    const f = FIELD_BY_KEY[key]
    if (!f) return key
    return getFieldLabel(f, tAdd).replace(/↳\s*/g, '').replace(/\s*\(mm\)/gi, '').trim()
  }
  function valStr(a: Additions | null, key: string): string {
    const f = FIELD_BY_KEY[key]
    const raw = a?.[key]
    if (raw == null) return '—'
    if (f?.side === 'global') return raw === true ? t('piedro_layer.yes') : '—'
    const sv = raw as SidedVal
    const one = (v: unknown) => (has(v) ? (f?.type === 'mm' ? `${v} mm` : f?.type === 'toggle' ? t('piedro_layer.yes') : translateOptionValue(key, String(v), tAdd)) : '—')
    return unit === 'LEFT_RIGHT' ? `L ${one(sv?.l)} / R ${one(sv?.r)}` : one(has(sv?.l) ? sv?.l : sv?.r)
  }

  const patchKeys = Object.keys(patch)
  const canSave = !saving && (contradictions.length === 0 || confirmed)

  function handleSave() {
    setErr('')
    startSaving(async () => {
      const res = await updateOrderAdditionsOverrideAction(order.id, patchKeys.length ? patch : null, note)
      if (res.error) { setErr(res.error); return }
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-stone-900/40 overflow-y-auto"
      onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-[14px] max-w-2xl w-full my-8 p-6 space-y-4"
        style={{ boxShadow: 'var(--shadow-card)' }} onClick={e => e.stopPropagation()}>

        <div>
          <h3 className="text-base font-bold text-stone-900">{t('piedro_layer.modal_title')}</h3>
          <p className="text-sm text-stone-500 mt-1 leading-relaxed">{t('piedro_layer.modal_intro')}</p>
        </div>

        {/* The client's comment, kept visible while transcribing. */}
        {order.comments && (
          <div className="bg-stone-50 border border-stone-100 rounded-lg p-3">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide mb-1">{t('piedro_layer.client_comment')}</p>
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{order.comments}</p>
          </div>
        )}

        <div className="max-h-[45vh] overflow-y-auto pr-1 -mr-1 border-y border-stone-100 py-3">
          <AdditionsForm
            unit={unit as 'PAIR' | 'LEFT' | 'RIGHT' | 'LEFT_RIGHT' | 'DIFF_SIZES'}
            closure={product?.closure ?? ''}
            addsExclude={(product?.adds_exclude as string) ?? ''}
            additions={edited}
            onChange={setEdited}
            soleProfile={soleProfile}
            section={product?.section ?? null}
            zsmGroup={zsmGroup}
          />
        </div>

        {/* Live diff vs the client's submission. */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">
            {t('piedro_layer.changes_count', { n: patchKeys.length })}
          </p>
          {patchKeys.length > 0 && (
            <div className="space-y-1">
              {changes.map(c => (
                <div key={c.key} className={`flex items-baseline justify-between gap-3 text-xs rounded-md px-2.5 py-1.5 ${c.contradiction ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-100'}`}>
                  <span className="font-medium text-stone-700">{labelOf(c.key)}</span>
                  <span className="text-right text-stone-600">
                    {c.contradiction && <span className="text-stone-400 line-through mr-1.5">{valStr(clientAdditions, c.key)}</span>}
                    <span className={c.contradiction ? 'text-amber-800 font-semibold' : 'text-green-700 font-semibold'}>{valStr(patch, c.key)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {contradictions.length > 0 && (
          <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 custom-gold shrink-0" />
            <span className="text-xs text-amber-800 leading-relaxed">{t('piedro_layer.contradiction_confirm', { n: contradictions.length })}</span>
          </label>
        )}

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">{t('piedro_layer.note_label')}</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder={t('piedro_layer.note_placeholder')}
            className="w-full h-9 px-3 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold" />
        </div>

        {err && <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">{err}</div>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50">
            {t('piedro_layer.cancel')}
          </button>
          <button onClick={handleSave} disabled={!canSave}
            className="px-5 py-2 text-sm font-semibold text-white bg-gold rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? t('piedro_layer.saving') : t('piedro_layer.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
