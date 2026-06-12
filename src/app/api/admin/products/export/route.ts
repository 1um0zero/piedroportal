/**
 * Export the catalogue to Excel in the "All models for the Platform" format.
 *
 * Mirrors the workbook consumed by the import (src/lib/products/excel-import.ts):
 * sheets KIDS / ADULTS / DELISTED, cr56f_* columns, one row per
 * style × colour × construction-group (constructions sharing the same widths).
 * The output round-trips through the importer unchanged.
 */
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getAdminScope } from '@/lib/admin/scope'
import { createServiceClient } from '@/lib/supabase/service'
import type { Construction, Product } from '@/types'

export const dynamic = 'force-dynamic'

const HEADERS = [
  'cr56f_priority', 'cr56f_sibling ', 'cr56f_gender', 'cr56f_name', 'cr56f_stylecolorid',
  'out/stock', 'cr56f_closure', 'cr56f_widthlist', 'cr56f_constructionlist',
  'cr56f_colorbasic', 'cr56f_color_name', 'cr56f_type', 'cr56f_category',
  'cr56f_sizefirst', 'cr56f_sizelast', 'cr56f_diabetics', 'cr56f_info',
  'Picture Name', 'cr56f_exclusive$', 'adds_exclude', 'STRETCH', 'LAST',
] as const

const GENDER_OUT: Record<string, string> = { KIDS: 'KIDS', MEN: 'MAN', WOMEN: 'WOMAN' }

type ProductRow = Product & { gallery_position?: number | null }

/** 9.5 → "9½" like the source workbook; whole sizes stay numeric. */
function fmtSize(n: number): string | number {
  if (!n) return ''
  return Number.isInteger(n) ? n : `${Math.floor(n)}½`
}

/** Group constructions by identical width sets → one sheet row per group. */
function constructionGroups(constructions: Construction[]): { constructions: string; widths: string }[] {
  const byWidths = new Map<string, { widths: string[]; names: string[] }>()
  for (const c of constructions ?? []) {
    const key = [...c.widths].sort().join(',')
    const g = byWidths.get(key) ?? { widths: c.widths, names: [] }
    g.names.push(c.construction)
    byWidths.set(key, g)
  }
  if (byWidths.size === 0) return [{ constructions: '', widths: '' }]
  return [...byWidths.values()].map(g => ({
    constructions: g.names.join(', '),
    widths: g.widths.join(', '),
  }))
}

function toRows(products: ProductRow[]): (string | number | null)[][] {
  const rows: (string | number | null)[][] = []
  for (const p of products) {
    const code = p.colour_id.includes('.') ? p.colour_id.split('.').pop()! : ''
    for (const g of constructionGroups(p.constructions)) {
      rows.push([
        p.gallery_position ?? null,
        p.sibling ?? '',
        GENDER_OUT[p.section] ?? p.section,
        p.style_name,
        code,
        p.is_stock ? 'STOCK' : '',
        p.closure,
        g.widths,
        g.constructions,
        p.color_basic,
        p.color_name,
        p.type,
        '', // cr56f_category — not stored in the portal
        fmtSize(p.size_first),
        fmtSize(p.size_last),
        p.diabetics ? 'TRUE' : 'FALSE',
        p.info ?? '',
        p.colour_id, // Picture Name
        p.exclusive ?? '',
        p.adds_exclude ?? '',
        '', '', // STRETCH / LAST — not stored in the portal
      ])
    }
  }
  return rows
}

export async function GET() {
  const scope = await getAdminScope()
  if (!scope || (scope.role === 'branch_staff' && !scope.branchId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()
  const all: ProductRow[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service
      .from('products').select('*')
      .order('colour_id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) break
    all.push(...(data as ProductRow[]))
    if (data.length < PAGE) break
    offset += PAGE
  }

  const visible = scope.allModels ? all : all.filter(p => scope.canModel(p.style_name))

  const sheets: Record<'KIDS' | 'ADULTS' | 'DELISTED', ProductRow[]> = { KIDS: [], ADULTS: [], DELISTED: [] }
  for (const p of visible) {
    if (!p.active) sheets.DELISTED.push(p)
    else if (p.section === 'KIDS') sheets.KIDS.push(p)
    else sheets.ADULTS.push(p)
  }

  const wb = XLSX.utils.book_new()
  for (const name of ['KIDS', 'ADULTS', 'DELISTED'] as const) {
    const ws = XLSX.utils.aoa_to_sheet([[...HEADERS], ...toRows(sheets[name])])
    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="All models for the Platform_${date}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
