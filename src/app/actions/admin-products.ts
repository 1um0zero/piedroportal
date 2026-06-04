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
  'size_first, size_last, diabetics, info, sibling, active, constructions, adds_exclude, exclusive'

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
  }
}

export interface ImportResult {
  created: number
  updated: number
  delisted: number
  skipped?: number  // rows ignored because the model is out of the caller's scope
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
  if (typeof scope === 'string') return { created: 0, updated: 0, delisted: 0, error: scope }

  const file = formData.get('file')
  const modesRaw = formData.get('sheetModes')
  if (!(file instanceof File)) return { created: 0, updated: 0, delisted: 0, error: 'No file' }

  let sheetModes: Record<string, SheetMode>
  try {
    sheetModes = JSON.parse(String(modesRaw ?? '{}'))
  } catch {
    return { created: 0, updated: 0, delisted: 0, error: 'Invalid sheet selection' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const imported = parseProducts(buffer, sheetModes)
  const existing = await fetchAllExisting()
  const preview = diffAgainstExisting(imported, existing)

  // Restrict every change to models within the caller's scope.
  let skipped = 0
  const inCreate = preview.toCreate.filter(p => scope.canModel(p.style_name) || (skipped++, false))
  const inUpdate = preview.toUpdate.filter(u => scope.canModel(u.product.style_name) || (skipped++, false))
  const inDelist = preview.toDelist.filter(d => scope.canModel(d.style_name) || (skipped++, false))

  const service = createServiceClient()
  const BATCH = 200

  // Inserts (picture_name starts empty — images are uploaded separately)
  const toInsert = inCreate.map(p => ({ id: randomUUID(), picture_name: '', ...toRow(p) }))
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const { error } = await service.from('products').insert(toInsert.slice(i, i + BATCH))
    if (error) return { created: 0, updated: 0, delisted: 0, skipped, error: `Insert failed: ${error.message}` }
  }

  // Updates (by id)
  let updated = 0
  for (const u of inUpdate) {
    const { error } = await service.from('products').update(toRow(u.product)).eq('id', u.existingId)
    if (error) return { created: toInsert.length, updated, delisted: 0, skipped, error: `Update failed: ${error.message}` }
    updated++
  }

  // Delist
  let delisted = 0
  const delistIds = inDelist.map(d => d.existingId)
  for (let i = 0; i < delistIds.length; i += BATCH) {
    const slice = delistIds.slice(i, i + BATCH)
    const { error } = await service.from('products').update({ active: false }).in('id', slice)
    if (error) return { created: toInsert.length, updated, delisted, skipped, error: `Delist failed: ${error.message}` }
    delisted += slice.length
  }

  revalidatePath('/admin/products')
  return { created: toInsert.length, updated, delisted, skipped }
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
