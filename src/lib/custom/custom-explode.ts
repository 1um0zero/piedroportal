import { allCustomFields, CUSTOM_SECTIONS, type CustomField } from '@/components/custom/custom-additions-config'

/**
 * A single normalized CUSTOM addition row — the exact shape persisted in the
 * `order_additions` table (migration 042) and consumed by the ERP/A-Shell. One
 * row per (field, side) that actually carries a value.
 */
export type CustomAdditionRow = {
  section:    string
  field:      string                 // the cs-code
  parent:     string | null          // conditionalOn parent, if any
  side:       'l' | 'r' | 'g'
  type:       'mm' | 'option' | 'text' | 'toggle' | 'image'
  value_num:  number | null
  value_text: string | null
  value_bool: boolean | null
}

type Sided = { l?: unknown; r?: unknown }

const DB_TYPE: Record<CustomField['type'], CustomAdditionRow['type']> = {
  mm: 'mm', option: 'option', text: 'text', toggle: 'toggle', upload: 'text',
}

function row(field: CustomField, section: string, side: CustomAdditionRow['side'], raw: unknown): CustomAdditionRow | null {
  if (raw == null || raw === '' || raw === false) return null
  const type = DB_TYPE[field.type]
  const r: CustomAdditionRow = {
    section, field: field.key, parent: field.conditionalOn ?? null, side, type,
    value_num: null, value_text: null, value_bool: null,
  }
  if (type === 'mm')          r.value_num  = typeof raw === 'number' ? raw : Number(raw)
  else if (type === 'toggle') r.value_bool = raw === true
  else                        r.value_text = String(raw)
  if (type === 'mm' && Number.isNaN(r.value_num)) return null
  return r
}

/** Section key for each field (so order_additions.section is set correctly). */
function sectionOf(): Map<string, string> {
  const m = new Map<string, string>()
  for (const s of CUSTOM_SECTIONS) for (const g of s.groups) for (const f of g.fields) m.set(f.key, s.key)
  return m
}

/**
 * Explode the CUSTOM form value map into the flat order_additions rows. Only
 * fields that carry a value produce rows.
 *   - side 'both'  → up to two rows (l, r) from a { l, r } value
 *   - side 'global'→ one 'g' row
 *   - side 'left'/'right' → one 'l'/'r' row
 */
export function explodeCustomAdditions(values: Record<string, unknown> | null | undefined): CustomAdditionRow[] {
  if (!values) return []
  const secOf = sectionOf()
  const out: CustomAdditionRow[] = []
  for (const field of allCustomFields()) {
    const section = secOf.get(field.key) ?? 'unknown'
    const v = values[field.key]
    if (field.side === 'both') {
      const sv = v as Sided | null
      const l = row(field, section, 'l', sv?.l); if (l) out.push(l)
      const r = row(field, section, 'r', sv?.r); if (r) out.push(r)
    } else if (field.side === 'left') {
      const l = row(field, section, 'l', v); if (l) out.push(l)
    } else if (field.side === 'right') {
      const r = row(field, section, 'r', v); if (r) out.push(r)
    } else {
      const g = row(field, section, 'g', v); if (g) out.push(g)
    }
  }
  return out
}
