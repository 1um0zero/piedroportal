/**
 * Field catalog for the LLM additions extractor (/api/additions/extract).
 *
 * Builds a compact, product-scoped description of every addition field the LLM
 * may map free-text comments onto — key, type, side, valid values (mm range or
 * option list, already narrowed by the model's sole profile / ZSM status), the
 * EN label, and the curated synonyms. Server-safe (no client-only imports).
 */
import { SECTIONS, filterExcluded, isSectionExcluded, zsmFieldHidden, type AdditionField } from '@/components/order/additions-config'
import { soleFieldHidden, allowedSoleValues } from '@/components/order/sole-profiles'
import type { ZsmGroup } from '@/components/order/zsm-profiles'
import { SYNONYMS } from '@/lib/comment-addition-detector'
import enMessages from '../../messages/en.json'

export type ExtractCtx = {
  unit: string
  closure: string
  addsExclude: string
  soleProfile: string | null
  section: string | null
  zsmGroup: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FIELD_LABELS: Record<string, string> = (enMessages as any).additions?.field_labels ?? {}

function labelOf(key: string): string {
  const raw = FIELD_LABELS[key]
  if (!raw) return key
  return String(raw).replace(/↳\s*/g, '').replace(/\s*\(mm\)/gi, '').trim()
}

/** The section key a field belongs to (or '' if unknown). */
export function sectionOf(key: string): string {
  for (const s of SECTIONS) if (s.fields.some(f => f.key === key)) return s.key
  return ''
}

/** Fields visible for this product context (mirrors the form's own filtering). */
export function visibleFields(ctx: ExtractCtx): AdditionField[] {
  const out: AdditionField[] = []
  for (const section of SECTIONS) {
    if (isSectionExcluded(section.key, ctx.addsExclude)) continue
    for (const f of filterExcluded(section.fields, ctx.addsExclude)) {
      if (f.closureOnly && f.closureOnly !== ctx.closure) continue
      if (f.mirror && (ctx.unit === 'LEFT' || ctx.unit === 'RIGHT')) continue
      if (soleFieldHidden(ctx.soleProfile, f.key, (f.values ?? []) as string[])) continue
      if (zsmFieldHidden(ctx.zsmGroup as ZsmGroup | null, f.key)) continue
      out.push(f)
    }
  }
  return out
}

/** One compact catalog line per visible field, for the LLM prompt. */
export function buildCatalog(ctx: ExtractCtx): string {
  const lines: string[] = []
  for (const f of visibleFields(ctx)) {
    const parent = f.conditionalOn ? ` parent=${f.conditionalOn}` : ''
    let vals: string
    if (f.type === 'mm') {
      const arr = (f.values ?? []) as number[]
      vals = arr.length ? `mm ${Math.min(...arr)}-${Math.max(...arr)}` : 'mm'
    } else if (f.type === 'toggle') {
      vals = 'yes/no'
    } else if (f.type === 'text') {
      vals = 'free text'
    } else {
      const allowed = allowedSoleValues(ctx.soleProfile, f.key, (f.values ?? []) as string[]) as string[]
      vals = `one of: ${allowed.join(' | ')}`
    }
    const syn = SYNONYMS[f.key]?.length ? `  syn: ${SYNONYMS[f.key].join(', ')}` : ''
    lines.push(`${f.key} [${f.type}${f.side === 'global' ? ' global' : ''}${parent}] "${labelOf(f.key)}" ${vals}${syn}`)
  }
  return lines.join('\n')
}
