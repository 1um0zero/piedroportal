'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { productImageUrl } from '@/lib/products/image-url'
import type { Product } from '@/types'
import CustomAdditionsForm from './CustomAdditionsForm'
import {
  CUSTOM_SECTIONS, allCustomFields, customLabel,
  LAST_HEIGHT_KEY, CIRC_BY_HEIGHT, HEEL_HEIGHT_KEY, SOLE_HEIGHT_KEY,
  FITTING_SHOE_TYPE_KEY, FITTING_SHOE_WITH_SUPPLEMENT,
  LEATHER_AS_MODEL_KEY, CLOSURE_AS_MODEL_KEY,
  STIFFENER_TYPE_L_KEY, STIFFENER_TYPE_R_KEY,
  STIFFENER_MATERIAL_L_KEY, STIFFENER_MATERIAL_R_KEY,
  type CustomField,
} from './custom-additions-config'
import { insertCustomOrderAction, type CustomOrderRow } from '@/app/actions/custom-orders'

type Sided = { l?: number | string; r?: number | string }
const sideEmpty = (v: unknown, s: 'l' | 'r') => {
  const sv = (v ?? {}) as Sided
  return sv[s] == null || sv[s] === ''
}

type Company = { id: string; name: string; erp_code: string }
const UNITS = ['PAIR', 'LEFT', 'RIGHT', 'LEFT_RIGHT'] as const

export default function CustomOrderForm({
  product, userCompany, companies, isAdmin,
}: {
  product:     Product
  userCompany: Company | null
  companies:   Company[]
  isAdmin:     boolean
}) {
  const locale = useLocale()
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [companyId, setCompanyId] = useState(userCompany?.id ?? companies[0]?.id ?? '')
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('PAIR')
  const [patient, setPatient] = useState('')
  const [reference, setReference] = useState('')
  const [clinician, setClinician] = useState('')
  const [comments, setComments] = useState('')
  // Defaults per Martin (pptx 30-6-2026): article nr autofilled from the model,
  // "as model" boxes checked, Measurement Back on, Normal toe reinforcement.
  const [values, setValues] = useState<Record<string, unknown>>({
    'cs3.article': product.colour_id,
    [LEATHER_AS_MODEL_KEY]: true,
    [CLOSURE_AS_MODEL_KEY]: true,
    'cs4.measure_back': true,
    'cs5.toe_option': 'Normal',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const needsCompany = !userCompany && companies.length > 0
  const canNext1 = reference.trim() !== '' && patient.trim() !== '' && (!needsCompany || companyId)

  // Sole Height autofills from the Last tab's Heel Height and follows it until the
  // user types their own value (Martin slides 4/8).
  const onValues = (next: Record<string, unknown>) => {
    const src  = next[HEEL_HEIGHT_KEY] as Sided | undefined
    const prev = values[HEEL_HEIGHT_KEY] as Sided | undefined
    const dst  = { ...((next[SOLE_HEIGHT_KEY] as Sided) ?? {}) }
    let touched = false
    for (const s of ['l', 'r'] as const) {
      const follows = dst[s] == null || dst[s] === '' || dst[s] === prev?.[s]
      if (follows && dst[s] !== (src?.[s] ?? '')) { dst[s] = src?.[s] ?? ''; touched = true }
    }
    setValues(touched ? { ...next, [SOLE_HEIGHT_KEY]: dst } : next)
  }

  const sides: ('l' | 'r')[] = unit === 'LEFT' ? ['l'] : unit === 'RIGHT' ? ['r'] : ['l', 'r']

  function missingRequired(): string[] {
    const miss: string[] = []
    const lbl = (f: CustomField) => customLabel(f.label, locale)
    for (const f of allCustomFields()) {
      if (!f.required) continue
      const v = values[f.key]
      if (f.side === 'both') {
        for (const s of sides) if (sideEmpty(v, s)) miss.push(`${lbl(f)} (${s.toUpperCase()})`)
      } else if (v == null || v === '') {
        miss.push(lbl(f))
      }
    }
    // A picked last height makes the circumference row at that height required.
    const lastH = values[LAST_HEIGHT_KEY] as Sided | undefined
    for (const s of sides) {
      const circKey = CIRC_BY_HEIGHT[String(lastH?.[s] ?? '')]
      if (circKey && sideEmpty(values[circKey], s))
        miss.push(`Circumference at ${lastH?.[s]} (${s.toUpperCase()})`)
    }
    // Plastic fitting shoes: the type choice is required; "including supplement"
    // requires at least one supplement type.
    if (values['cs1.41_yn'] === true) {
      const ft = values[FITTING_SHOE_TYPE_KEY]
      if (!ft) miss.push('Fitting shoe type')
      if (ft === FITTING_SHOE_WITH_SUPPLEMENT) {
        const anySupplement = ['cs2.21_yn', 'cs2.22_yn', 'cs2.23_yn', 'cs2.24_yn', 'cs2.25_yn', 'cs2.26_yn', 'cs2.27_yn', 'cs2.28_yn', 'cs2.29_yn']
          .some(k => values[k] === true)
        if (!anySupplement) miss.push('Supplement (required with the chosen fitting shoe)')
      }
    }
    // Every stiffener selection needs a material.
    if (sides.includes('l') && values[STIFFENER_TYPE_L_KEY] && !values[STIFFENER_MATERIAL_L_KEY])
      miss.push('Stiffener material (L)')
    if (sides.includes('r') && values[STIFFENER_TYPE_R_KEY] && !values[STIFFENER_MATERIAL_R_KEY])
      miss.push('Stiffener material (R)')
    return miss
  }

  async function save(status: 'draft' | 'submitted') {
    if (status === 'submitted') {
      const miss = missingRequired()
      if (miss.length) { setStep(2); setError(`Please fill the required fields: ${miss.join(', ')}`); return }
    }
    setBusy(true); setError(null)
    const row: CustomOrderRow = {
      company_id: companyId || userCompany?.id || null,
      locale, product_id: product.id, status, unit,
      clinician: clinician.trim() || null,
      patient_name: patient.trim() || null,
      reference_customer: reference.trim() || null,
      quantity: 1,
      comments: comments.trim() || null,
      additions: values,
    }
    const res = await insertCustomOrderAction(row)
    setBusy(false)
    if (res.error) { setError(res.error); return }
    setDone(status === 'draft' ? 'Draft saved.' : 'Custom order submitted.')
    setTimeout(() => router.push('/orders'), 1200)
  }

  const tabs = ['Customer & Product', 'Customization', 'Confirmation']
  const img = productImageUrl(product.picture_name)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-gold">Custom-Made Shoes</div>
      <h1 className="mb-6 text-2xl font-light text-stone-800">{product.style_name} · {product.colour_id}</h1>

      {/* Tab bar */}
      <div className="mb-6 flex gap-6 border-b border-stone-200">
        {tabs.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3
          return (
            <button key={label} onClick={() => n < step && setStep(n)}
              className={`-mb-px border-b-2 pb-3 text-sm ${step === n ? 'border-gold text-gold' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
              {i + 1}. {label}
            </button>
          )
        })}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {done && <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{done}</div>}

      {/* ── Tab 1 — Customer & Product ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="flex gap-4 rounded-[14px] border border-stone-200 bg-white p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {img && <img src={img} alt={product.style_name} className="h-24 w-24 rounded-lg object-contain" />}
            <div className="text-sm text-stone-600">
              <div className="font-medium text-stone-800">{product.style_name}</div>
              <div>{product.color_name} · {product.colour_id}</div>
              <div className="text-stone-400">{product.section} · {product.closure}</div>
            </div>
          </div>

          {needsCompany && (
            <Field label="Company *">
              <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="input">
                <option value="">—</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
          {isAdmin && !needsCompany && companies.length > 0 && (
            <Field label="Company *">
              <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="input">
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="Customer / Patient *">
            <input value={patient} onChange={e => setPatient(e.target.value)} className="input" />
          </Field>
          <Field label="Reference *">
            <input value={reference} onChange={e => setReference(e.target.value)} className="input" />
          </Field>
          <Field label="Clinician">
            <input value={clinician} onChange={e => setClinician(e.target.value)} className="input" />
          </Field>

          <Field label="Type">
            <div className="flex gap-2">
              {UNITS.map(u => (
                <button key={u} onClick={() => setUnit(u)}
                  className={`rounded-lg border px-3 py-2 text-sm ${unit === u ? 'border-gold bg-gold/10 text-gold' : 'border-stone-300 text-stone-600'}`}>
                  {u.replace('_', ' / ')}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex justify-end">
            <button disabled={!canNext1} onClick={() => setStep(2)}
              className="rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-white disabled:opacity-40">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Tab 2 — Customization ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <CustomAdditionsForm values={values} onChange={onValues} unit={unit} />
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-stone-500">← Back</button>
            <button onClick={() => setStep(3)} className="rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-white">Next →</button>
          </div>
        </div>
      )}

      {/* ── Tab 3 — Confirmation ───────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-[14px] border border-stone-200 bg-white p-5 text-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
            <Row k="Model" v={`${product.style_name} · ${product.colour_id}`} />
            <Row k="Customer" v={patient || '—'} />
            <Row k="Reference" v={reference || '—'} />
            <Row k="Type" v={unit.replace('_', ' / ')} />
            <CustomSummary values={values} locale={locale} />
          </div>
          <Field label="Comments">
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} className="input" />
          </Field>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-stone-500">← Back</button>
            <div className="flex gap-3">
              <button disabled={busy} onClick={() => save('draft')}
                className="rounded-lg border border-stone-300 px-5 py-2.5 text-sm text-stone-600 disabled:opacity-40">Save draft</button>
              <button disabled={busy} onClick={() => save('submitted')}
                className="rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-white disabled:opacity-40">Submit order</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.input) { width: 100%; border-radius: 0.5rem; border: 1px solid #d6d3d1; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-500">{label}</label>
      {children}
    </div>
  )
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b border-stone-100 py-1.5"><span className="text-stone-400">{k}</span><span className="text-stone-700">{v}</span></div>
}

function CustomSummary({ values, locale }: { values: Record<string, unknown>; locale: string }) {
  const has = (v: unknown) => v != null && v !== '' && v !== false &&
    !(typeof v === 'object' && !(v as { l?: unknown; r?: unknown }).l && !(v as { l?: unknown; r?: unknown }).r)
  const fmt = (v: unknown): string => {
    if (v === true) return 'Yes'
    if (typeof v === 'object' && v) { const s = v as { l?: unknown; r?: unknown }; return `L ${s.l ?? '—'} / R ${s.r ?? '—'}` }
    return String(v)
  }
  const sections = CUSTOM_SECTIONS
    .map(s => ({
      s,
      rows: s.groups.flatMap(g => g.fields).map(f => ({ f, v: values[f.key] })).filter(({ v }) => has(v)),
    }))
    .filter(({ rows }) => rows.length)

  if (!sections.length) return <div className="py-2 text-stone-400">No customizations selected.</div>
  return (
    <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
      {sections.map(({ s, rows }) => (
        <div key={s.key}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold">{customLabel(s.label, locale)}</div>
          {rows.map(({ f, v }) => (
            <div key={f.key} className="flex justify-between py-0.5 text-xs">
              <span className="text-stone-500">{customLabel(f.label, locale)}</span>
              <span className="text-stone-700">{fmt(v)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
