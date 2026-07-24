'use client'

import { useLocale } from 'next-intl'
import { useState } from 'react'
import {
  CUSTOM_SECTIONS, customLabel,
  CUSTOM_ARTICLE_KEY, CUSTOM_SEED_DEFAULTS, CUSTOM_MM_RANGES,
  customValueActive, customFieldVisible, stripCustomOrphans,
  type CustomField, type CustomSection, type LeatherPiece,
} from './custom-additions-config'
import { overrideLabel, type OptionOverrides } from '@/lib/additions/option-tables'
import { RangeField } from '@/components/ui/RangeField'
import { LeatherPieces } from './LeatherPieces'

// Expande [min,max,step?] à lista de valores que o RangeField percorre.
const rangeToValues = ([min, max, step = 1]: [number, number, number?]): number[] => {
  const out: number[] = []
  for (let v = min; v <= max; v += step) out.push(v)
  return out
}
// Valor para o RangeField: '' / null → null (campo vazio).
const mmVal = (v: unknown): number | string | null =>
  v === '' || v == null ? null : (v as number | string)

type Vals = Record<string, unknown>
type Sided = { l?: number | string | ''; r?: number | string | '' }
type Unit = 'PAIR' | 'LEFT' | 'RIGHT' | 'LEFT_RIGHT'

function isActive(values: Vals, key?: string): boolean {
  return !key || customValueActive(values[key])
}

/** conditionalOn shows a field while its parent is truthy; hiddenWhen hides it;
 *  conditionalOnValues needs the parent to hold one of the listed values.
 *  Logic lives in custom-additions-config (shared with the orphan scrub). */
function isVisible(values: Vals, f: CustomField): boolean {
  return customFieldVisible(values, f)
}

/** ⓘ note toggled next to a group heading. */
function InfoNote({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={() => setShow(s => !s)} aria-label="Information"
        className={`ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors
          ${show ? 'border-gold bg-gold text-white' : 'border-stone-300 text-stone-400 hover:border-gold hover:text-gold'}`}>
        i
      </button>
      {show && (
        <span className="absolute left-6 top-0 z-10 w-72 rounded-lg border border-stone-200 bg-white p-3 text-xs font-normal normal-case tracking-normal text-stone-600 shadow-lg">
          {text}
        </span>
      )}
    </span>
  )
}

/** Special layout for measurement groups: narrow L/R mm inputs flanking a centred
 *  tag (numbered field name, or a hint like "350 mm" / "I"), optionally beside a
 *  reference diagram. Hovering/focusing a row highlights the matching measurement
 *  on the diagram in gold; focus pins it. Renders without a diagram when none. */
function MeasurementGrid({
  fields, image, markers, values, locale, setSide, num, showL, showR,
}: {
  fields: CustomField[]
  image?: string
  markers?: Record<string, { x: number; y: number }>
  values: Vals
  locale: string
  setSide: (key: string, side: 'l' | 'r', v: number | string | '') => void
  num: (e: React.ChangeEvent<HTMLInputElement>) => number | ''
  showL: boolean
  showR: boolean
}) {
  // hover previews the marker; focus pins it (stays fixed until another field is focused)
  const [hover, setHover] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const active = focused ?? hover
  const inputCls = (on: boolean) =>
    `w-16 rounded-lg border px-2 py-2 text-sm text-center tabular-nums transition-colors
     ${on ? 'border-gold ring-1 ring-gold/40' : 'border-stone-300'}`

  const rows = fields.map(f => {
    const full = customLabel(f.label, locale)
    const hint = f.hint ? customLabel(f.hint, locale) : ''
    const m = /^\s*(\d+)\s*[:.]\s*(.*)$/.exec(full)
    // tag = what shows in the centre column and keys the diagram marker
    const tag = m ? m[1] : hint
    const center = m
      ? <><span className="text-stone-400">{m[1]}.</span> {m[2]}</>
      : (hint || full)
    const sv = (values[f.key] as Sided) ?? {}
    const on = !!tag && active === tag
    return (
      <div key={f.key}
        onMouseEnter={() => tag && setHover(tag)} onMouseLeave={() => setHover(null)}
        className="grid grid-cols-[auto_1fr_auto] items-center gap-2 py-1">
        <div className="flex items-center gap-1 justify-self-start">
          {showL && <>
            <input inputMode="numeric" value={sv.l ?? ''} onChange={e => setSide(f.key, 'l', num(e))}
              onFocus={() => tag && setFocused(tag)} onBlur={() => setFocused(null)} className={inputCls(on)} />
            <span className="text-[11px] text-stone-400">mm</span>
          </>}
        </div>
        <div className={`text-xs font-medium ${m ? 'text-left' : 'text-center'} ${on ? 'text-gold' : 'text-stone-600'}`}>{center}</div>
        <div className="flex items-center gap-1 justify-self-end">
          {showR && <>
            <input inputMode="numeric" value={sv.r ?? ''} onChange={e => setSide(f.key, 'r', num(e))}
              onFocus={() => tag && setFocused(tag)} onBlur={() => setFocused(null)} className={inputCls(on)} />
            <span className="text-[11px] text-stone-400">mm</span>
          </>}
        </div>
      </div>
    )
  })

  const grid = (
    <div className="min-w-0 flex-1">
      <div className="mb-1 grid grid-cols-[auto_1fr_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
        <span className="w-16 text-left">{showL ? 'Left' : ''}</span><span /><span className="w-16 text-left">{showR ? 'Right' : ''}</span>
      </div>
      {rows}
    </div>
  )

  const mk = active && image && markers ? markers[active] : null
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
      {grid}
      {/* Right zone: the diagram, or a blank white square placeholder so the
          Right column lines up with the diagram-bearing sections. */}
      <div className="relative mx-auto aspect-square w-full max-w-[300px] shrink-0 lg:w-[300px]">
        {image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Measurement diagram" className="h-full w-full object-contain" />
            {mk && (
              <span aria-hidden
                className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold bg-gold/10 animate-pulse"
                style={{ left: `${mk.x}%`, top: `${mk.y}%` }} />
            )}
          </>
        ) : (
          <div className="h-full w-full rounded-xl border border-dashed border-stone-200 bg-white" />
        )}
      </div>
    </div>
  )
}

/** Config-driven CUSTOM additions form. Renders sections → groups → fields with
 *  L/R mm inputs, toggles, dropdowns and conditional children. Deliberately
 *  simpler than the OSB AdditionsForm (no GLB/sole/ZSM machinery) — a clean
 *  canvas to iterate the custom-made set on. */
export default function CustomAdditionsForm({
  values, onChange, unit = 'LEFT_RIGHT', optionOverrides, articleDefault, styleName,
}: {
  values: Vals
  onChange: (next: Vals) => void
  unit?: Unit
  optionOverrides?: OptionOverrides
  articleDefault?: string
  /** The chosen model's style number — resolves its maquette drawing. */
  styleName?: string
}) {
  const locale = useLocale()

  // Effective options for an option/image field: DB-driven (back-office) when the
  // field has overrides, else the static config. `values` are the canonical
  // stored strings; `labelOf` is display-only; `imageOf` returns a resolved URL.
  const fieldOptions = (f: CustomField): {
    values: string[]
    imageOf: (v: string) => string | undefined
    labelOf: (v: string) => string
  } => {
    const ov = optionOverrides?.[f.key]
    if (ov && ov.length) {
      const byVal = new Map(ov.map(o => [o.value, o]))
      return {
        values: ov.map(o => o.value),
        imageOf: v => byVal.get(v)?.image ?? undefined,
        labelOf: v => { const o = byVal.get(v); return o ? overrideLabel(o, locale) : v },
      }
    }
    return {
      values: (f.values ?? []).map(String),
      imageOf: v => f.images?.[v],
      labelOf: v => v,
    }
  }
  // All sections start closed (Martin slide 1) so the whole structure is visible.
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [popup, setPopup] = useState<string | null>(null)

  // LEFT / RIGHT orders only show that side across the whole form (Martin slide 1)
  const showL = unit !== 'RIGHT'
  const showR = unit !== 'LEFT'

  // Every write goes out through the orphan scrub: values whose parent/visibility
  // condition no longer holds are dropped in the same update, so a hidden field
  // can never linger in the order (recado-pp-orfaos-pai-filho).
  const emit = (next: Vals) => onChange(stripCustomOrphans(next))
  const set = (key: string, v: unknown) => emit({ ...values, [key]: v })
  const setSide = (key: string, side: 'l' | 'r', v: number | string | '') => {
    const cur = (values[key] as Sided) ?? {}
    emit({ ...values, [key]: { ...cur, [side]: v } })
  }

  const num = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s*mm$/i, '').trim()
    return raw === '' ? '' : Number(raw)
  }

  function renderField(f: CustomField) {
    if (!isVisible(values, f)) return null
    if (f.side === 'left' && !showL) return null
    if (f.side === 'right' && !showR) return null
    const label = customLabel(f.label, locale)
    const hint = f.hint ? customLabel(f.hint, locale) : null
    const indent = f.conditionalOn ? 'ml-6' : ''

    if (f.type === 'toggle') {
      const on = values[f.key] === true
      return (
        <label key={f.key} className={`flex items-center gap-2 py-1.5 cursor-pointer ${indent}`}>
          <input type="checkbox" checked={on} onChange={e => {
            const next = e.target.checked
            set(f.key, next)
            if (f.popup && ((f.popupOn ?? 'check') === 'check' ? next : !next)) setPopup(f.popup)
          }}
            className="h-4 w-4 accent-[#B8975A]" />
          {f.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.thumb} alt={label}
              className={`${f.thumbWide ? 'h-9 w-[72px]' : 'h-9 w-9'} shrink-0 rounded-md border border-stone-200 bg-white object-contain p-0.5`} />
          )}
          <span className="text-sm text-stone-700">{label}</span>
          {f.picturePending && <span className="text-[10px] text-stone-400">(image pending)</span>}
        </label>
      )
    }

    if (f.type === 'image') {
      const opts = fieldOptions(f)
      const selected = (values[f.key] as string) || null
      // collapse: once a value is picked, show only it; click again to reveal all
      // (required não colapsa — não é desmarcável, ficaria preso)
      const shown = f.collapse && selected && !f.required ? [selected] : opts.values
      return (
        <div key={f.key} className={`py-2 ${indent}`}>
          <label className="mb-2 block text-xs text-stone-500">{label}</label>
          <div className="flex flex-wrap gap-2.5">
            {shown.map(v => {
              const val = String(v)
              const src = opts.imageOf(val)
              const on = selected === val
              return (
                <button key={val} type="button" title={opts.labelOf(val)}
                  onClick={() => set(f.key, on && !f.required ? '' : val)}
                  className={`group relative flex w-[104px] flex-col items-center rounded-xl border p-2 transition-all
                    ${on ? 'border-gold bg-gold/5 ring-2 ring-gold/30 shadow-sm' : 'border-stone-200 bg-white hover:border-gold/60'}`}>
                  {src
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={src} alt={opts.labelOf(val)} className="pointer-events-none h-[68px] w-full object-contain" />
                    : <div className="flex h-[68px] w-full items-center justify-center text-[10px] text-stone-300">—</div>}
                  <span className={`mt-1 text-[11px] font-medium ${on ? 'text-gold' : 'text-stone-600'}`}>{opts.labelOf(val)}</span>
                  {on && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-white shadow-sm">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (f.type === 'option' && f.dropdown) {
      const sided = f.side === 'both'
      const opts = fieldOptions(f)
      const selCls = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm'
      const selectEl = (sel: string, pick: (v: string) => void, ph: string) => (
        <select value={sel} onChange={e => pick(e.target.value)} className={selCls} aria-label={`${label} ${ph}`.trim()}>
          <option value="">{ph ? `${ph} —` : '—'}</option>
          {opts.values.map(v => <option key={v} value={v}>{opts.labelOf(v)}</option>)}
        </select>
      )
      const sv = (values[f.key] as { l?: string; r?: string }) ?? {}
      return (
        <div key={f.key} className={`py-1.5 ${indent}`}>
          <label className="mb-1 block text-xs text-stone-500">{label}</label>
          {sided ? (
            <div className="flex items-center gap-2">
              {showL && selectEl(sv.l ?? '', v => setSide(f.key, 'l', v), 'L')}
              {showR && selectEl(sv.r ?? '', v => setSide(f.key, 'r', v), 'R')}
            </div>
          ) : selectEl((values[f.key] as string) ?? '', v => set(f.key, v), '')}
        </div>
      )
    }

    if (f.type === 'option') {
      const sided = f.side === 'both'
      const opts = fieldOptions(f)
      const chipRow = (sel: string | null, pick: (v: string) => void) => {
        // required não colapsa: como não é desmarcável, colapsar prendia-o no default
        const shown = f.collapse && sel && !f.required ? [sel] : opts.values
        return (
          <div className="flex flex-wrap gap-1.5">
            {shown.map(v => {
              const val = String(v); const on = sel === val
              return (
                <button key={val} type="button" onClick={() => pick(on && !f.required ? '' : val)}
                  className={`rounded border px-3 py-1.5 text-xs font-medium transition-all
                    ${on ? 'border-gold bg-gold text-white shadow-sm' : 'border-stone-200 bg-white text-stone-600 hover:border-gold/60 hover:text-gold'}`}>
                  {opts.labelOf(val)}
                </button>
              )
            })}
          </div>
        )
      }
      const sv = (values[f.key] as Sided & { l?: string; r?: string }) ?? {}
      return (
        <div key={f.key} className={`py-1.5 ${indent}`}>
          <label className="mb-1 block text-xs text-stone-500">{label}</label>
          {sided ? (
            <div className="space-y-1.5">
              {showL && <div className="flex items-center gap-2"><span className="w-4 text-[10px] text-stone-400">L</span>{chipRow((sv.l as string) ?? null, v => setSide(f.key, 'l', v as unknown as number | ''))}</div>}
              {showR && <div className="flex items-center gap-2"><span className="w-4 text-[10px] text-stone-400">R</span>{chipRow((sv.r as string) ?? null, v => setSide(f.key, 'r', v as unknown as number | ''))}</div>}
            </div>
          ) : chipRow((values[f.key] as string) ?? null, v => set(f.key, v))}
        </div>
      )
    }

    if (f.type === 'text' || f.type === 'upload') {
      return (
        <div key={f.key} className={`py-1.5 ${indent}`}>
          <label className="block text-xs text-stone-500 mb-1">{label}{f.type === 'upload' && ' ⤴'}</label>
          <input type="text" value={(values[f.key] as string) ?? ''} onChange={e => set(f.key, e.target.value)}
            placeholder={f.type === 'upload' ? 'file upload — coming soon' : ''}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
      )
    }

    if (f.type === 'leather-pieces') {
      return (
        <div key={f.key} className={`py-1.5 ${indent}`}>
          <LeatherPieces
            styleName={styleName}
            label={label}
            hint={hint}
            value={(values[f.key] as LeatherPiece[]) ?? []}
            onChange={v => set(f.key, v)}
          />
        </div>
      )
    }

    // mm
    const sided = f.side === 'both'
    const sv = (values[f.key] as Sided) ?? {}
    const single = (values[f.key] as number | '' | undefined) ?? ''
    // Adaptações limitadas → slider RangeField; medições livres → texto.
    const range = CUSTOM_MM_RANGES[f.key]
    const rvals = range ? rangeToValues(range) : null
    return (
      <div key={f.key} className={`py-1.5 ${indent}`}>
        <label className="block text-xs text-stone-500 mb-1">
          {label}{hint && <span className="ml-1 text-stone-400">· {hint}</span>}
        </label>
        {sided ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {showL && (rvals
              ? <span className="inline-flex items-center gap-1.5"><span className="text-[10px] text-stone-400">L</span>
                  <RangeField values={rvals} value={mmVal(sv.l)} onChange={v => setSide(f.key, 'l', v ?? '')} unit="mm" /></span>
              : <input inputMode="numeric" placeholder="L" value={sv.l ?? ''} onChange={e => setSide(f.key, 'l', num(e))}
                  className="flex-1 min-w-0 rounded-lg border border-stone-300 px-3 py-2 text-sm" />)}
            {showR && (rvals
              ? <span className="inline-flex items-center gap-1.5"><span className="text-[10px] text-stone-400">R</span>
                  <RangeField values={rvals} value={mmVal(sv.r)} onChange={v => setSide(f.key, 'r', v ?? '')} unit="mm" /></span>
              : <input inputMode="numeric" placeholder="R" value={sv.r ?? ''} onChange={e => setSide(f.key, 'r', num(e))}
                  className="flex-1 min-w-0 rounded-lg border border-stone-300 px-3 py-2 text-sm" />)}
            {!rvals && <span className="text-sm text-stone-400 shrink-0">mm</span>}
          </div>
        ) : rvals ? (
          <RangeField values={rvals} value={mmVal(single)} onChange={v => set(f.key, v ?? '')} unit="mm" />
        ) : (
          <div className="flex items-center gap-2">
            <input inputMode="numeric" value={single} onChange={e => set(f.key, num(e))}
              className="flex-1 min-w-0 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            <span className="text-sm text-stone-400 shrink-0">mm</span>
          </div>
        )}
      </div>
    )
  }

  function renderSection(s: CustomSection) {
    const isOpen = open[s.key]
    // Regras (Jorge 2026-07-16): valores por defeito (artigo, as-model, measure
    // back, toe Normal) NÃO são adaptações à partida; contam só quando o
    // utilizador os muda para um valor diferente do default (e não-vazio).
    const seedDefaultOf = (key: string): unknown =>
      key === CUSTOM_ARTICLE_KEY ? articleDefault
      : (key in CUSTOM_SEED_DEFAULTS ? CUSTOM_SEED_DEFAULTS[key] : undefined)
    const filled = s.groups.flatMap(g => g.fields).filter(f => {
      const def = seedDefaultOf(f.key)
      if (def !== undefined) {
        const cur = values[f.key]
        return cur != null && cur !== '' && cur !== def
      }
      return isActive(values, f.key)
    }).length
    const empty = s.groups.every(g => g.fields.length === 0)
    return (
      <div key={s.key} className="rounded-[14px] border border-stone-200 bg-white" style={{ boxShadow: 'var(--shadow-card)' }}>
        <button type="button" onClick={() => setOpen(o => ({ ...o, [s.key]: !o[s.key] }))}
          className="flex w-full items-center justify-between px-5 py-4">
          <span className="font-medium text-stone-800">{customLabel(s.label, locale)}</span>
          <span className="flex items-center gap-3 text-sm text-stone-400">
            {empty ? <em className="text-xs">coming next</em> : filled > 0 && <span className="text-gold">{filled}</span>}
            <span>{isOpen ? '−' : '+'}</span>
          </span>
        </button>
        {isOpen && !empty && (
          <div className="space-y-4 border-t border-stone-100 px-5 py-4">
            {s.groups.map(g => (
              <div key={g.key}>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {customLabel(g.label, locale)}
                  {g.info && <InfoNote text={customLabel(g.info, locale)} />}
                </h4>
                {g.render === 'measurements' ? (
                  <MeasurementGrid fields={g.fields} image={g.image} markers={g.markers}
                    values={values} locale={locale} setSide={setSide} num={num} showL={showL} showR={showR} />
                ) : (
                  <div>{g.fields.map(renderField)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {CUSTOM_SECTIONS.map(renderSection)}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setPopup(null)}>
          <div className="w-full max-w-sm rounded-[14px] border border-stone-200 bg-white p-6 text-center"
            style={{ boxShadow: 'var(--shadow-card)' }} onClick={e => e.stopPropagation()}>
            <div className="mb-3 text-xs font-semibold uppercase tracking-[3px] text-gold">Please note</div>
            <p className="mb-5 text-sm text-stone-700">{popup}</p>
            <button type="button" onClick={() => setPopup(null)}
              className="rounded-lg bg-gold px-6 py-2 text-sm font-medium text-white">OK</button>
          </div>
        </div>
      )}
    </div>
  )
}
