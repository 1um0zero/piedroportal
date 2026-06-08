import { SECTIONS } from '@/components/order/additions-config'

/**
 * Normalized addition row — the stable, ERP-facing shape for an order's additions.
 * Phase 1 of the additions normalization (§19): derived on the fly from the current
 * `additions` JSONB + the form config, so the a-shell contract depends on a clean
 * 1:N list (only present items) instead of the wide raw JSON. Phase 2 will persist
 * this exact shape in an `order_additions` table without changing this output.
 */
export type ErpAddition = {
  section: string                    // additions | upper | sole | others
  field: string                      // field key (e.g. 'hammer_toe')
  parent: string | null             // conditionalOn parent, for child fields
  side: 'l' | 'r' | 'g'             // 'g' = global (whole order)
  type: string                       // mm | option | text | toggle | image
  value: number | string | boolean
}

type Sided = { l?: unknown; r?: unknown }

/** Explode the additions JSONB into a flat list of only the present additions. */
export function explodeAdditions(additions: Record<string, unknown> | null | undefined): ErpAddition[] {
  if (!additions) return []
  const out: ErpAddition[] = []
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      const parent = field.conditionalOn ?? null
      if (field.side === 'global') {
        if (additions[field.key] === true) {
          out.push({ section: section.key, field: field.key, parent, side: 'g', type: field.type, value: true })
        }
        continue
      }
      const sv = additions[field.key] as Sided | null
      for (const side of ['l', 'r'] as const) {
        const val = sv?.[side]
        if (val == null || val === '' || val === false) continue
        const value: number | string | boolean =
          field.type === 'toggle' ? true
          : field.type === 'mm'   ? (typeof val === 'number' ? val : Number(val))
          : String(val)
        out.push({ section: section.key, field: field.key, parent, side, type: field.type, value })
      }
    }
  }
  return out
}
