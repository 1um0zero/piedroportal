import { type NextRequest, NextResponse } from 'next/server'
import { requireCatalogueWrite } from '@/lib/admin/guard'
import { fetchAllExisting } from '@/app/actions/admin-products'
import {
  listSheets, parseProducts, diffAgainstExisting, suggestSheetMode,
  type SheetMode,
} from '@/lib/products/excel-import'

const SAMPLE = 50

export async function POST(request: NextRequest) {
  const auth = await requireCatalogueWrite()
  if ('error' in auth) return auth.error
  const { scope } = auth

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())

  let sheets
  try {
    sheets = listSheets(buffer)
  } catch {
    return NextResponse.json({ error: 'Could not read the workbook. Is it a valid .xls/.xlsx file?' }, { status: 400 })
  }

  // Modes: use the client's selection if present, else the per-sheet suggestion.
  let modes: Record<string, SheetMode> = {}
  const modesRaw = form.get('sheetModes')
  if (modesRaw) {
    try { modes = JSON.parse(String(modesRaw)) } catch { /* fall through to defaults */ }
  }
  if (Object.keys(modes).length === 0) {
    for (const s of sheets) modes[s.name] = suggestSheetMode(s.name)
  }

  const imported = parseProducts(buffer, modes)
  const existing = await fetchAllExisting()
  const preview = diffAgainstExisting(imported, existing)

  // Restrict the preview to the caller's model scope so it matches what apply does.
  if (!scope.allModels) {
    preview.toCreate = preview.toCreate.filter(p => scope.canModel(p.style_name))
    preview.toUpdate = preview.toUpdate.filter(u => scope.canModel(u.product.style_name))
    preview.toDelist = preview.toDelist.filter(d => scope.canModel(d.style_name))
    preview.withEmptyConstructions = preview.withEmptyConstructions.filter(e => scope.canModel(e.style_name))
    preview.withMissingVital = preview.withMissingVital.filter(e => scope.canModel(e.style_name))
  }

  // Rejected = unsafe to publish (no constructions OR a vital field missing).
  const rejected = [
    ...preview.withEmptyConstructions.map(e => ({ ...e, missing: ['constructions'] })),
    ...preview.withMissingVital,
  ]

  return NextResponse.json({
    sheets,
    modesUsed: modes,
    outNew: preview.outNew,  // colour_ids to pre-exclude in the grid
    counts: {
      create: preview.toCreate.length,
      update: preview.toUpdate.length,
      unchanged: preview.unchanged,
      delist: preview.toDelist.length,
      pending: preview.withPending.length,
      rejected: rejected.length,
      out: preview.outNew.length,
      stockFlag: preview.stockToFlag.length,
    },
    samples: {
      // Full list (not sliced): every new product is individually selectable in
      // the preview grid so the admin can exclude rows before confirming.
      create: preview.toCreate
        .map(p => ({ colour_id: p.colour_id, style_name: p.style_name, color_name: p.color_name, section: p.section, is_stock: p.is_stock, out: p.out })),
      update: preview.toUpdate.slice(0, SAMPLE)
        .map(u => ({ colour_id: u.product.colour_id, style_name: u.product.style_name, color_name: u.product.color_name, changedFields: u.changedFields })),
      delist: preview.toDelist.slice(0, SAMPLE),
      pending: preview.withPending.slice(0, SAMPLE),
      rejected: rejected.slice(0, SAMPLE),
      // Existing products the sheet marks STOCK (col F) whose is_stock isn't set yet.
      stockFlag: preview.stockToFlag.slice(0, SAMPLE),
    },
  })
}
