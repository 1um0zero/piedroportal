'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope, type AdminScope } from '@/lib/admin/scope'
import {
  parseProducts, diffAgainstExisting,
  type SheetMode, type ExistingProduct, type ImportedProduct,
} from '@/lib/products/excel-import'
import type { Product } from '@/types'

// ── Auth helper (server actions) ─────────────────────────────────────────────

/** Returns the caller's back-office scope, or a string error when not authorized. */
async function assertBackoffice(): Promise<AdminScope | string> {
  const scope = await getAdminScope()
  if (!scope) return 'Not authenticated'
  if (scope.role === 'branch_staff' && !scope.branchId) return 'Not authorized'
  return scope
}

// ── Existing catalogue (paginated) ───────────────────────────────────────────

const EXISTING_FIELDS =
  'id, colour_id, style_name, section, closure, type, color_basic, color_name, ' +
  'size_first, size_last, diabetics, info, sibling, active, constructions, adds_exclude, exclusive, is_stock'

export async function fetchAllExisting(): Promise<ExistingProduct[]> {
  const service = createServiceClient()
  const all: ExistingProduct[] = []
  let offset = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await service
      .from('products').select(EXISTING_FIELDS)
      .range(offset, offset + PAGE - 1)
    if (error || !data?.length) break
    all.push(...(data as unknown as ExistingProduct[]))
    if (data.length < PAGE) break
    offset += PAGE
  }
  return all
}

// ── Import: apply (re-parses the file, writes via service client) ────────────

/** Convert an ImportedProduct to a DB row (drops the preview-only `pending`/`sourceSheet`). */
function toRow(p: ImportedProduct): Omit<Product, 'id' | 'picture_name' | 'color_name_i18n' | 'new_until'> {
  return {
    style_name:   p.style_name,
    colour_id:    p.colour_id,
    section:      p.section,
    closure:      p.closure,
    type:         p.type,
    color_basic:  p.color_basic,
    color_name:   p.color_name,
    size_first:   p.size_first,
    size_last:    p.size_last,
    diabetics:    p.diabetics,
    info:         p.info,
    sibling:      p.sibling,
    active:       p.active,
    constructions: p.constructions,
    adds_exclude: p.adds_exclude,
    exclusive:    p.exclusive,
    is_stock:     p.is_stock,
  }
}

export interface ImportResult {
  created: number
  skipped?: number       // rows ignored because the model is out of the caller's scope
  rejected?: number      // active rows rejected for having no constructions
  rejectedRefs?: string[]
  discrepancies?: number // existing rows where the sheet disagrees with the DB (reported, NOT applied)
  discrepancyRefs?: string[]
  stockFlagged?: number  // existing products newly flagged is_stock from the sheet's STOCK marker
  error?: string
}

/**
 * Apply an Excel import. Re-parses + re-diffs server-side (deterministic, so it
 * matches the previewed result) and writes:
 *  - new colour_ids → insert with a fresh uuid
 *  - changed existing → update by id
 *  - DELISTED rows present & active → active = false
 * Products absent from the sheet are left untouched.
 */
export async function applyProductImport(
  formData: FormData,
): Promise<ImportResult> {
  const scope = await assertBackoffice()
  if (typeof scope === 'string') return { created: 0, error: scope }

  const file = formData.get('file')
  const modesRaw = formData.get('sheetModes')
  if (!(file instanceof File)) return { created: 0, error: 'No file' }

  let sheetModes: Record<string, SheetMode>
  try {
    sheetModes = JSON.parse(String(modesRaw ?? '{}'))
  } catch {
    return { created: 0, error: 'Invalid sheet selection' }
  }

  // colour_ids the admin unticked in the preview grid — never inserted.
  let exclude = new Set<string>()
  const excludeRaw = formData.get('exclude')
  if (excludeRaw) {
    try { exclude = new Set(JSON.parse(String(excludeRaw)) as string[]) } catch { /* ignore */ }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const imported = parseProducts(buffer, sheetModes)
  const existing = await fetchAllExisting()
  const preview = diffAgainstExisting(imported, existing)

  // The portal is the source of truth: the import only CREATES new models and
  // VALIDATES existing ones. It never overwrites existing rows (the sheet can be
  // stale/partial) — discrepancies are reported so the sheet can be fixed.
  // Rejected = rows that are unsafe to publish (no constructions OR a vital field
  // missing); they are never created.
  const rejectedList = [...preview.withEmptyConstructions, ...preview.withMissingVital]
  const rejected = rejectedList.length
  const rejectedRefs = rejectedList.map(e => e.colour_id)

  // Restrict every change to models within the caller's scope, and drop any
  // colour_id the admin excluded in the preview.
  let skipped = 0
  const inCreate = preview.toCreate
    .filter(p => !exclude.has(p.colour_id))
    .filter(p => scope.canModel(p.style_name) || (skipped++, false))
  const inUpdate = preview.toUpdate.filter(u => scope.canModel(u.product.style_name))
  const discrepancies = inUpdate.length
  const discrepancyRefs = inUpdate.map(u => u.product.colour_id)

  const service = createServiceClient()
  const BATCH = 200

  // Inserts only (picture_name starts empty — images are uploaded separately).
  const toInsert = inCreate.map(p => ({ id: randomUUID(), picture_name: '', ...toRow(p) }))
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const { error } = await service.from('products').insert(toInsert.slice(i, i + BATCH))
    if (error) return { created: 0, skipped, rejected, rejectedRefs, error: `Insert failed: ${error.message}` }
  }

  // Flag existing products the sheet marks STOCK (single-column update; safe,
  // never touches descriptive fields). Skips excluded colour_ids and out-of-scope.
  const flagIds = preview.stockToFlag
    .filter(s => !exclude.has(s.colour_id))
    .map(s => s.existingId)
  let stockFlagged = 0
  for (let i = 0; i < flagIds.length; i += BATCH) {
    const slice = flagIds.slice(i, i + BATCH)
    const { error } = await service.from('products').update({ is_stock: true }).in('id', slice)
    if (!error) stockFlagged += slice.length
  }

  revalidatePath('/admin/products')
  return { created: toInsert.length, skipped, rejected, rejectedRefs, discrepancies, discrepancyRefs, stockFlagged }
}

// ── Standalone product CRUD ──────────────────────────────────────────────────

export type ProductInput = Omit<Product, 'id'>

export async function createProduct(
  input: ProductInput,
): Promise<{ id?: string; error?: string }> {
  const scope = await assertBackoffice()
  if (typeof scope === 'string') return { error: scope }

  if (!input.colour_id?.trim()) return { error: 'colour_id is required' }
  if (!scope.canModel(input.style_name)) return { error: 'This model is out of your scope' }

  const service = createServiceClient()
  // Guard against duplicate colour_id (the business key).
  const { data: clash } = await service
    .from('products').select('id').eq('colour_id', input.colour_id).maybeSingle()
  if (clash) return { error: `A product with colour_id "${input.colour_id}" already exists` }

  const id = randomUUID()
  const { error } = await service.from('products').insert({ id, ...input })
  if (error) return { error: error.message }

  revalidatePath('/admin/products')
  return { id }
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<{ ok?: boolean; error?: string }> {
  const scope = await assertBackoffice()
  if (typeof scope === 'string') return { error: scope }

  const service = createServiceClient()

  // Authorize against the product's current model (and the new one, if changed).
  if (!scope.allModels) {
    const { data: current } = await service
      .from('products').select('style_name').eq('id', id).maybeSingle()
    if (!current || !scope.canModel(current.style_name as string))
      return { error: 'This model is out of your scope' }
    if (input.style_name != null && !scope.canModel(input.style_name))
      return { error: 'This model is out of your scope' }
  }

  const { error } = await service.from('products').update(input).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${id}/edit`)
  return { ok: true }
}

// ── Gallery style ordering ────────────────────────────────────────────────────

const SECTIONS = ['KIDS', 'MEN', 'WOMEN'] as const

/**
 * Persist the gallery order for a section. `orderedStyles` is the full list of
 * style_names in their new display order; each style's `gallery_position` is set
 * to its index (same value written to every colour variant of the style). The
 * gallery then sorts by gallery_position. Branch staff may only reorder styles
 * within their scope.
 */
export async function saveStyleOrder(
  section: string,
  orderedStyles: string[],
): Promise<{ ok?: boolean; error?: string }> {
  const scope = await assertBackoffice()
  if (typeof scope === 'string') return { error: scope }
  if (!SECTIONS.includes(section as typeof SECTIONS[number])) return { error: 'Invalid section' }

  const service = createServiceClient()
  const styles = (scope.allModels ? orderedStyles : orderedStyles.filter(s => scope.canModel(s)))
    .map((s, i) => ({ s, i }))

  // Pooled updates — one statement per style (touches all its variants).
  let cursor = 0
  const worker = async (): Promise<void> => {
    while (cursor < styles.length) {
      const { s, i } = styles[cursor++]
      const { error } = await service
        .from('products')
        .update({ gallery_position: i })
        .eq('section', section)
        .eq('style_name', s)
      if (error) throw new Error(error.message)
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(8, styles.length) }, worker))
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }

  revalidatePath('/admin/products/order')
  revalidatePath('/gallery')
  return { ok: true }
}

export async function setProductActive(
  id: string,
  active: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  const scope = await assertBackoffice()
  if (typeof scope === 'string') return { error: scope }

  const service = createServiceClient()

  if (!scope.allModels) {
    const { data: current } = await service
      .from('products').select('style_name').eq('id', id).maybeSingle()
    if (!current || !scope.canModel(current.style_name as string))
      return { error: 'This model is out of your scope' }
  }

  const { error } = await service.from('products').update({ active }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/products')
  return { ok: true }
}

/** Toggle the editorial NEW flag (products.is_new) shown as a badge in the gallery. */
export async function setProductNew(
  id: string,
  is_new: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  const scope = await assertBackoffice()
  if (typeof scope === 'string') return { error: scope }

  const service = createServiceClient()

  if (!scope.allModels) {
    const { data: current } = await service
      .from('products').select('style_name').eq('id', id).maybeSingle()
    if (!current || !scope.canModel(current.style_name as string))
      return { error: 'This model is out of your scope' }
  }

  const { error } = await service.from('products').update({ is_new }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/products')
  return { ok: true }
}
