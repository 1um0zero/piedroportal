/**
 * Excel → Product import logic (pure, server-side, no I/O side effects).
 *
 * Mirrors the mapping proven in scripts/dataverse-import.mjs, adapted to the
 * "All models for the Platform" workbook (cr56f_* columns, one row per
 * style × colour × construction-group). Rows are grouped by colour_id
 * (= Picture Name = style_name.colourcode) and their constructions are unioned.
 */

import * as XLSX from 'xlsx'
import type { Construction, Product, Section } from '@/types'

// ── Sheets ─────────────────────────────────────────────────────────────────────

export type SheetMode = 'active' | 'delisted' | 'skip'

export interface SheetInfo {
  name: string
  rows: number
  /** Suggested default handling based on the sheet name. */
  suggested: SheetMode
}

/** Default handling per known sheet name. */
export function suggestSheetMode(name: string): SheetMode {
  const n = name.trim().toUpperCase()
  if (n === 'DELISTED') return 'delisted'
  if (n === 'KIDS' || n === 'ADULTS') return 'active'
  return 'skip' // Sheet1 and anything unexpected
}

// ── Header-keyed row reader ──────────────────────────────────────────────────

/** Normalised column keys we care about (trimmed header → canonical). */
const COL = {
  sibling:          'cr56f_sibling',
  gender:           'cr56f_gender',
  name:             'cr56f_name',
  stylecolorid:     'cr56f_stylecolorid',
  closure:          'cr56f_closure',
  widthlist:        'cr56f_widthlist',
  constructionlist: 'cr56f_constructionlist',
  colorbasic:       'cr56f_colorbasic',
  color_name:       'cr56f_color_name',
  type:             'cr56f_type',
  sizefirst:        'cr56f_sizefirst',
  sizelast:         'cr56f_sizelast',
  diabetics:        'cr56f_diabetics',
  info:             'cr56f_info',
  pictureName:      'Picture Name',
  exclusive:        'cr56f_exclusive$',
  addsExclude:      'adds_exclude',
  // PENDING — real columns, not yet mapped to the DB. Preserved for inspection.
  stretch:          'STRETCH',
  last:             'LAST',
  outStock:         'OUT/STOCK',
} as const

type RawRow = Record<string, unknown>

/** Read a worksheet into objects keyed by trimmed header name. */
function readSheet(ws: XLSX.WorkSheet): RawRow[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  if (!matrix.length) return []
  const headers = (matrix[0] as unknown[]).map(h => String(h ?? '').trim())
  const out: RawRow[] = []
  for (let i = 1; i < matrix.length; i++) {
    const arr = matrix[i] as unknown[]
    if (!arr || arr.every(v => v == null || v === '')) continue
    const row: RawRow = {}
    headers.forEach((h, c) => { row[h] = arr[c] ?? null })
    out.push(row)
  }
  return out
}

// ── Field parsers (ported from dataverse-import.mjs) ─────────────────────────

const GENDER_LABEL_MAP: Record<string, Section> = {
  KIDS: 'KIDS', MAN: 'MEN', MEN: 'MEN', WOMAN: 'WOMEN', WOMEN: 'WOMEN',
}

function decodeGender(raw: unknown): Section {
  const label = String(raw ?? '').trim().toUpperCase()
  return GENDER_LABEL_MAP[label] ?? 'MEN'
}

const FRACS: Record<string, number> = { '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75 }

export function parseSize(v: unknown): number | null {
  if (v == null || v === '') return null
  const s = String(v).trim().replace(',', '.')
  const match = s.match(/^(\d+)\s*([½⅓⅔¼¾])/)
  if (match) {
    return parseInt(match[1], 10) + (FRACS[match[2]] ?? 0)
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  return String(v ?? '').trim().toUpperCase() === 'TRUE'
}

/** A clean string or null (trims, treats blank as null). */
function str(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/** 4-digit colour code, preserving leading zeros (336 → "0336", "1500" → "1500"). */
function colourCode(v: unknown): string {
  const s = String(v ?? '').trim()
  return /^\d+$/.test(s) ? s.padStart(4, '0') : s
}

function buildConstructions(constructionList: unknown, widthList: unknown): Construction[] {
  const cl = String(constructionList ?? '').trim()
  if (!cl) return []
  const constructions = cl.split(/[,;]/).map(s => s.trim()).filter(Boolean)
  const widths = String(widthList ?? '')
    .split(/[,;]/).map(s => s.trim()).filter(Boolean)
  return constructions.map(c => ({ construction: c, widths }))
}

/** Merge construction lists: union widths per construction name, keep first-seen order. */
function mergeConstructions(into: Construction[], add: Construction[]): Construction[] {
  const map = new Map<string, Set<string>>()
  for (const c of [...into, ...add]) {
    const set = map.get(c.construction) ?? new Set<string>()
    c.widths.forEach(w => set.add(w))
    map.set(c.construction, set)
  }
  return [...map.entries()].map(([construction, widths]) => ({ construction, widths: [...widths] }))
}

// ── Imported product shape ───────────────────────────────────────────────────

/** Product fields written by the import (no id / picture_name — those are managed elsewhere). */
export type ImportedProduct = Pick<Product,
  'style_name' | 'colour_id' | 'section' | 'closure' | 'type' | 'color_basic' |
  'color_name' | 'size_first' | 'size_last' | 'diabetics' | 'info' | 'sibling' |
  'active' | 'constructions' | 'adds_exclude' | 'exclusive'
> & {
  /** PENDING columns, preserved for preview only — not written to the DB yet. */
  pending: { stretch: string | null; last: string | null; outStock: string | null }
  /** Source sheet name (for the preview). */
  sourceSheet: string
}

// ── Workbook parsing ─────────────────────────────────────────────────────────

export function listSheets(buffer: ArrayBuffer | Buffer): SheetInfo[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  return wb.SheetNames.map(name => {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: null })
    return { name, rows: Math.max(0, matrix.length - 1), suggested: suggestSheetMode(name) }
  })
}

/**
 * Parse the workbook and group rows into products.
 * `sheetModes` maps sheet name → how to treat it ('active' | 'delisted' | 'skip').
 */
export function parseProducts(
  buffer: ArrayBuffer | Buffer,
  sheetModes: Record<string, SheetMode>,
): ImportedProduct[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const groups = new Map<string, ImportedProduct>()

  for (const sheetName of wb.SheetNames) {
    const mode = sheetModes[sheetName] ?? 'skip'
    if (mode === 'skip') continue
    const active = mode === 'active'

    for (const row of readSheet(wb.Sheets[sheetName])) {
      const styleName = str(row[COL.name])
      if (!styleName) continue
      const code = colourCode(row[COL.stylecolorid])
      // Prefer reconstructed key (preserves leading zeros); fall back to Picture Name.
      const colourId = code ? `${styleName}.${code}` : (str(row[COL.pictureName]) ?? '')
      if (!colourId) continue

      const constructions = buildConstructions(row[COL.constructionlist], row[COL.widthlist])

      const existing = groups.get(colourId)
      if (existing) {
        existing.constructions = mergeConstructions(existing.constructions, constructions)
        continue
      }

      groups.set(colourId, {
        style_name:   styleName,
        colour_id:    colourId,
        section:      decodeGender(row[COL.gender]),
        closure:      (str(row[COL.closure]) ?? '').toUpperCase() as Product['closure'],
        type:         (str(row[COL.type]) ?? '') as Product['type'],
        color_basic:  str(row[COL.colorbasic]) ?? '',
        color_name:   str(row[COL.color_name]) ?? '',
        size_first:   parseSize(row[COL.sizefirst]) ?? 0,
        size_last:    parseSize(row[COL.sizelast]) ?? 0,
        diabetics:    parseBool(row[COL.diabetics]),
        info:         str(row[COL.info]),
        sibling:      str(row[COL.sibling]),
        active,
        constructions,
        adds_exclude: str(row[COL.addsExclude]) ?? '',
        exclusive:    str(row[COL.exclusive]) ?? '',
        pending: {
          stretch:  str(row[COL.stretch]),
          last:     str(row[COL.last]),
          outStock: str(row[COL.outStock]),
        },
        sourceSheet: sheetName,
      })
    }
  }

  return [...groups.values()]
}

// ── Diff against the existing catalogue ──────────────────────────────────────

/** Minimal existing-product shape needed to diff. */
export interface ExistingProduct {
  id: string
  colour_id: string
  style_name: string
  section: string
  closure: string
  type: string
  color_basic: string
  color_name: string
  size_first: number
  size_last: number
  diabetics: boolean
  info: string | null
  sibling: string | null
  active: boolean
  constructions: Construction[]
  adds_exclude: string | null
  exclusive: string | null
}

/** Fields compared to decide whether an existing product changed (picture_name excluded). */
const COMPARED_FIELDS = [
  'style_name', 'section', 'closure', 'type', 'color_basic', 'color_name',
  'size_first', 'size_last', 'diabetics', 'info', 'sibling', 'active',
  'adds_exclude', 'exclusive',
] as const

function constructionsEqual(a: Construction[], b: Construction[]): boolean {
  const norm = (cs: Construction[]) =>
    JSON.stringify(
      [...cs]
        .map(c => ({ construction: c.construction, widths: [...c.widths].sort() }))
        .sort((x, y) => x.construction.localeCompare(y.construction)),
    )
  return norm(a) === norm(b)
}

export interface ProductDiff {
  colour_id: string
  style_name: string
  color_name: string
  changedFields: string[]
}

export interface ImportPreview {
  toCreate: ImportedProduct[]
  toUpdate: { product: ImportedProduct; existingId: string; changedFields: string[] }[]
  unchanged: number
  /** Existing active products this import would deactivate (DELISTED rows). */
  toDelist: { colour_id: string; existingId: string; style_name: string }[]
  /** Products with PENDING column data, surfaced for inspection. */
  withPending: { colour_id: string; stretch: string | null; last: string | null; outStock: string | null }[]
}

export function diffAgainstExisting(
  imported: ImportedProduct[],
  existing: ExistingProduct[],
): ImportPreview {
  const byColour = new Map(existing.map(e => [e.colour_id, e]))
  const preview: ImportPreview = { toCreate: [], toUpdate: [], unchanged: 0, toDelist: [], withPending: [] }

  for (const p of imported) {
    const ex = byColour.get(p.colour_id)

    if (p.pending.stretch || p.pending.last || p.pending.outStock) {
      preview.withPending.push({ colour_id: p.colour_id, ...p.pending })
    }

    // DELISTED sheet: only act on products that exist and are currently active.
    if (!p.active) {
      if (ex && ex.active) {
        preview.toDelist.push({ colour_id: p.colour_id, existingId: ex.id, style_name: p.style_name })
      } else if (!ex) {
        // Not in catalogue and delisted — nothing to do.
      }
      continue
    }

    if (!ex) {
      preview.toCreate.push(p)
      continue
    }

    const changed: string[] = []
    for (const f of COMPARED_FIELDS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((p as any)[f] !== (ex as any)[f]) changed.push(f)
    }
    if (!constructionsEqual(p.constructions, ex.constructions)) changed.push('constructions')

    if (changed.length === 0) preview.unchanged++
    else preview.toUpdate.push({ product: p, existingId: ex.id, changedFields: changed })
  }

  return preview
}
