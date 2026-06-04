import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/guard'
import { fetchAllExisting } from '@/app/actions/admin-products'
import {
  listSheets, parseProducts, diffAgainstExisting, suggestSheetMode,
  type SheetMode,
} from '@/lib/products/excel-import'

const SAMPLE = 50

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

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

  return NextResponse.json({
    sheets,
    modesUsed: modes,
    counts: {
      create: preview.toCreate.length,
      update: preview.toUpdate.length,
      unchanged: preview.unchanged,
      delist: preview.toDelist.length,
      pending: preview.withPending.length,
    },
    samples: {
      create: preview.toCreate.slice(0, SAMPLE)
        .map(p => ({ colour_id: p.colour_id, style_name: p.style_name, color_name: p.color_name, section: p.section })),
      update: preview.toUpdate.slice(0, SAMPLE)
        .map(u => ({ colour_id: u.product.colour_id, style_name: u.product.style_name, color_name: u.product.color_name, changedFields: u.changedFields })),
      delist: preview.toDelist.slice(0, SAMPLE),
      pending: preview.withPending.slice(0, SAMPLE),
    },
  })
}
