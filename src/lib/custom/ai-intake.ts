// AI-assisted CUSTOM intake (BETA) — prompt → additions.
//
// Beta of the natural-language order intake (§16.3), running FIRST on the CUSTOM
// channel (admin-only, in development): the clinician describes the customizations
// in free text ("heel height 70mm, velcro closure with D-ring, advancing rocker"),
// the LLM maps it onto the closed CUSTOM_SECTIONS schema, and this module
// validates every proposed item against the config — anything that doesn't match
// an existing field/value is DROPPED and reported, never invented. The user then
// reviews the pre-filled form field by field, exactly as if typed by hand.

import {
  CUSTOM_SECTIONS, allCustomFields, customLabel, CUSTOM_MM_RANGES,
  CUSTOM_ARTICLE_KEY, type CustomField,
} from '@/components/custom/custom-additions-config'

export type AiItem = { key: string; side: 'l' | 'r' | 'both' | 'global'; value: string | number | boolean }
export type AiApplied = { key: string; label: string; side: string; value: string }
export type AiApplyResult = {
  patch: Record<string, unknown>
  applied: AiApplied[]
  warnings: string[]
}

const byKey = new Map<string, CustomField>(allCustomFields().map(f => [f.key, f]))

/** Fields the AI is never allowed to set. */
function aiExcluded(f: CustomField): boolean {
  return f.type === 'upload' || f.type === 'leather-pieces' || f.key === CUSTOM_ARTICLE_KEY
}

// ── field catalogue for the model (stable → prompt-cacheable) ────────────────
export function buildFieldCatalog(): string {
  const lines: string[] = []
  for (const section of CUSTOM_SECTIONS) {
    lines.push(`\n## Section: ${section.label.en}`)
    for (const group of section.groups) {
      lines.push(`### ${group.label.en}`)
      for (const f of group.fields) {
        if (aiExcluded(f)) continue
        const bits = [`key=${f.key}`, `"${customLabel(f.label, 'en')}"${f.hint?.en ? ` (${f.hint.en})` : ''}`, `type=${f.type === 'image' ? 'option' : f.type}`]
        bits.push(f.side === 'both' ? 'sides=L/R' : f.side === 'global' ? 'sides=global' : `sides=${f.side}`)
        if (f.type === 'mm') {
          const r = CUSTOM_MM_RANGES[f.key]
          bits.push(r ? `mm ${r[0]}-${r[1]}` : 'mm free')
        }
        if (f.values?.length) bits.push(`values: ${f.values.join(' | ')}`)
        if (f.conditionalOn) bits.push(`requires=${f.conditionalOn}`)
        if (f.conditionalOnValues) bits.push(`requires ${f.conditionalOnValues.key} in [${f.conditionalOnValues.values.join(', ')}]`)
        if (f.hiddenWhen) bits.push(`only when ${f.hiddenWhen}=false`)
        lines.push(`- ${bits.join(' | ')}`)
      }
    }
  }
  return lines.join('\n')
}

// ── validation / application ─────────────────────────────────────────────────
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/** Match a free value against the field's allowed values; null when ambiguous/absent. */
function matchOption(f: CustomField, raw: string): string | null {
  const values = (f.values ?? []).map(String)
  const n = norm(raw)
  const exact = values.find(v => norm(v) === n)
  if (exact) return exact
  const partial = values.filter(v => norm(v).includes(n) || n.includes(norm(v)))
  return partial.length === 1 ? partial[0] : null
}

type Sided = { l?: unknown; r?: unknown }

/**
 * Validate the model's proposed items against the config and build the patch to
 * merge into the form state. Never invents: invalid keys/values become warnings.
 */
export function applyAiItems(
  items: AiItem[],
  unit: 'LEFT_RIGHT' | 'LEFT' | 'RIGHT',
  current: Record<string, unknown>,
): AiApplyResult {
  const unitSides: ('l' | 'r')[] = unit === 'LEFT' ? ['l'] : unit === 'RIGHT' ? ['r'] : ['l', 'r']
  const patch: Record<string, unknown> = {}
  const applied: AiApplied[] = []
  const warnings: string[] = []
  const lbl = (f: CustomField) => customLabel(f.label, 'en')

  const setSided = (key: string, sides: ('l' | 'r')[], value: unknown) => {
    const base = { ...((current[key] as Sided) ?? {}), ...((patch[key] as Sided) ?? {}) }
    for (const s of sides) base[s] = value
    patch[key] = base
  }
  const truthyNow = (key: string): boolean => {
    const v = patch[key] ?? current[key]
    if (v == null || v === false || v === '') return false
    if (typeof v === 'object') { const sv = v as Sided; return !!(sv.l || sv.r) }
    return true
  }

  for (const item of items) {
    const f = byKey.get(item.key)
    if (!f) { warnings.push(`Unknown field "${item.key}" — skipped.`); continue }
    if (aiExcluded(f)) { warnings.push(`"${lbl(f)}" cannot be set from text — set it manually.`); continue }

    // value coercion by field type
    let value: unknown
    if (f.type === 'toggle') {
      value = item.value !== false
    } else if (f.type === 'mm') {
      const n = Number(item.value)
      if (!Number.isFinite(n)) { warnings.push(`"${lbl(f)}": "${item.value}" is not a number — skipped.`); continue }
      const r = CUSTOM_MM_RANGES[f.key]
      if (r && (n < r[0] || n > r[1])) {
        const clamped = Math.min(Math.max(n, r[0]), r[1])
        warnings.push(`"${lbl(f)}": ${n}mm is outside ${r[0]}–${r[1]}mm — clamped to ${clamped}mm, please confirm.`)
        value = clamped
      } else value = n
    } else if (f.type === 'option' || f.type === 'image') {
      const m = matchOption(f, String(item.value))
      if (!m) { warnings.push(`"${lbl(f)}": "${item.value}" doesn't match an option (allowed: ${(f.values ?? []).join(', ')}) — skipped.`); continue }
      value = m
    } else {
      value = String(item.value)
    }

    // gate on conditionalOnValues (e.g. anti-slip heel only for leather linings)
    if (f.conditionalOnValues) {
      const gate = patch[f.conditionalOnValues.key] ?? current[f.conditionalOnValues.key]
      if (!f.conditionalOnValues.values.includes(String(gate))) {
        warnings.push(`"${lbl(f)}" needs ${byKey.get(f.conditionalOnValues.key) ? lbl(byKey.get(f.conditionalOnValues.key)!) : f.conditionalOnValues.key} to be one of: ${f.conditionalOnValues.values.join(', ')} — skipped.`)
        continue
      }
    }

    // side handling
    let sideLabel = '—'
    if (f.side === 'both') {
      const want: ('l' | 'r')[] = item.side === 'l' ? ['l'] : item.side === 'r' ? ['r'] : unitSides
      const sides = want.filter(s => unitSides.includes(s))
      if (!sides.length) { warnings.push(`"${lbl(f)}": the order is ${unit} — the ${item.side === 'l' ? 'left' : 'right'} side doesn't apply.`); continue }
      setSided(f.key, sides, value)
      sideLabel = sides.length === 2 ? 'L+R' : sides[0].toUpperCase()
    } else {
      patch[f.key] = value
      sideLabel = f.side === 'left' ? 'L' : f.side === 'right' ? 'R' : '—'
    }

    applied.push({
      key: f.key, label: lbl(f), side: sideLabel,
      value: f.type === 'toggle' ? (value === false ? 'off' : 'yes') : f.type === 'mm' ? `${value}mm` : String(value),
    })
  }

  // Auto-activate parents (toggle chains, e.g. rocker mm → rocker heel → rocker yn)
  // and un-hide fields gated by an "as model" checkbox.
  let changed = true
  let guard = 0
  while (changed && guard++ < 10) {
    changed = false
    for (const a of [...applied]) {
      const f = byKey.get(a.key)!
      if (f.hiddenWhen && (patch[f.hiddenWhen] ?? current[f.hiddenWhen]) !== false) {
        patch[f.hiddenWhen] = false
        const hw = byKey.get(f.hiddenWhen)
        warnings.push(`"${hw ? lbl(hw) : f.hiddenWhen}" was unchecked so "${a.label}" applies.`)
        changed = true
      }
      if (!f.conditionalOn) continue
      const parent = byKey.get(f.conditionalOn)
      if (!parent || truthyNow(parent.key)) continue
      if (parent.type === 'toggle') {
        if (parent.side === 'both') setSided(parent.key, unitSides, true)
        else patch[parent.key] = true
        applied.push({ key: parent.key, label: lbl(parent), side: parent.side === 'both' ? (unitSides.length === 2 ? 'L+R' : unitSides[0].toUpperCase()) : '—', value: 'yes' })
        changed = true
      } else {
        warnings.push(`"${a.label}" needs "${lbl(parent)}" — choose it manually or mention it in the description.`)
      }
    }
  }

  return { patch, applied, warnings }
}
