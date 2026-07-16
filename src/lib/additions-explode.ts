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

/**
 * One addition as a human/LLM-facing node: a field with its per-side value(s) and
 * any conditional children nested underneath. Sided fields collapse to `both` when
 * L and R are equal, otherwise expose `left`/`right` separately. Global toggles set
 * `on: true`. Children are NEVER counted as separate additions — they are parameters
 * of their parent (e.g. Haglund height/position under Haglund).
 */
export type AdditionNode = {
  field: string
  label: string
  section: string
  type: string
  both?: number | string | boolean
  left?: number | string | boolean
  right?: number | string | boolean
  on?: true
  children: AdditionNode[]
}

export type AdditionsSummary = {
  count: number            // distinct top-level additions (children excluded from the count)
  items: AdditionNode[]
}

/**
 * Summarize an order's additions for display/reporting (chat assistant, etc.).
 * Reuses {@link explodeAdditions} so the "which additions are present" rule stays
 * in one place, then groups sides (L/R) per field and nests conditional children
 * under their parent — so counting is correct: parents/children are never summed
 * and L+R of the same field is a single addition.
 *
 * @param label maps a field key to a readable label (e.g. next-intl `field_labels.<key>`).
 */
export function summarizeAdditions(
  additions: Record<string, unknown> | null | undefined,
  label: (fieldKey: string) => string,
): AdditionsSummary {
  const rows = explodeAdditions(additions)

  // One node per field, filling sides as we encounter rows.
  const nodes = new Map<string, AdditionNode & { parent: string | null }>()
  const nodeFor = (r: ErpAddition) => {
    let n = nodes.get(r.field)
    if (!n) {
      n = { field: r.field, label: label(r.field), section: r.section, type: r.type, parent: r.parent, children: [] }
      nodes.set(r.field, n)
    }
    return n
  }
  for (const r of rows) {
    const n = nodeFor(r)
    if (r.side === 'g') n.on = true
    else if (r.side === 'l') n.left = r.value
    else if (r.side === 'r') n.right = r.value
  }

  // Collapse equal L/R into `both`; keep genuinely one-sided / differing values apart.
  for (const n of nodes.values()) {
    if (n.left != null && n.right != null && n.left === n.right) {
      n.both = n.left
      delete n.left
      delete n.right
    }
  }

  // Nest children under their parent; anything whose parent isn't present stays top-level.
  const top: AdditionNode[] = []
  for (const n of nodes.values()) {
    const parent = n.parent ? nodes.get(n.parent) : null
    if (parent) parent.children.push(n)
    else top.push(n)
  }

  return { count: top.length, items: top }
}

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
