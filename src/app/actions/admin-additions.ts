'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { normalizeToPng } from '@/lib/products/normalize-image'
import { ADDITIONS_BUCKET } from '@/lib/additions/option-image'
import {
  ADDITION_TABLES,
  ADDITION_FIELD_KEYS as FIELD_KEYS,
  type AdditionOption,
  type SaveAdditionOptionInput,
} from '@/lib/additions/option-tables'

/**
 * /admin/additions — CRUD for the editable option lists of the sole-amendment
 * additions fields (PU/EVA Bumper, Sole, Runner sole, Spoiler).
 *
 * PHASE 1: this is the editable SOURCE only — the order form still reads the
 * static config (src/components/order/additions-config.ts) at runtime, so these
 * edits do not yet change what customers see. See migration 051 for the plan.
 */

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const scope = await getAdminScope()
  if (!scope || !isPiedroAdmin(scope.role)) return { error: 'Not authorized' }
  return { userId: scope.userId }
}

/** All options grouped by field_key, each list ordered by sort_order then value. */
export async function listAdditionOptions(): Promise<Record<string, AdditionOption[]>> {
  const auth = await requireAdmin()
  const groups: Record<string, AdditionOption[]> = {}
  for (const t of ADDITION_TABLES) groups[t.key] = []
  if ('error' in auth) return groups

  const service = createServiceClient()
  const { data } = await service
    .from('addition_field_options')
    .select('*')
    .order('field_key', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('value', { ascending: true })

  for (const row of (data ?? []) as AdditionOption[]) {
    if (!groups[row.field_key]) groups[row.field_key] = []
    groups[row.field_key].push(row)
  }
  return groups
}

export async function saveAdditionOption(
  input: SaveAdditionOptionInput,
): Promise<{ ok?: boolean; id?: string; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  if (!FIELD_KEYS.has(input.field_key)) return { error: 'Unknown field' }
  const value = input.value.trim()
  if (!value) return { error: 'A value is required' }

  const service = createServiceClient()
  const patch = {
    field_key: input.field_key,
    value,
    family: input.family?.trim() || null,
    label_nl: input.label_nl?.trim() || null,
    label_fr: input.label_fr?.trim() || null,
    label_de: input.label_de?.trim() || null,
    active: input.active ?? true,
  }

  if (input.id) {
    const { error } = await service.from('addition_field_options').update(patch).eq('id', input.id)
    if (error) {
      if (error.code === '23505') return { error: `"${value}" already exists in this field` }
      return { error: error.message }
    }
    revalidatePath('/admin/additions')
    return { ok: true, id: input.id }
  }

  // New option → append after the current max sort_order for this field.
  const { data: maxRow } = await service
    .from('addition_field_options')
    .select('sort_order')
    .eq('field_key', input.field_key)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = ((maxRow?.sort_order as number | undefined) ?? 0) + 1

  const { data, error } = await service
    .from('addition_field_options')
    .insert({ ...patch, sort_order: nextOrder, created_by: auth.userId })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { error: `"${value}" already exists in this field` }
    return { error: error.message }
  }
  revalidatePath('/admin/additions')
  return { ok: true, id: data.id }
}

export async function deleteAdditionOption(id: string): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  // Best-effort remove of an uploaded bucket image (legacy /soles/ paths are left).
  const { data: row } = await service.from('addition_field_options').select('image_path').eq('id', id).maybeSingle()
  const path = row?.image_path as string | null | undefined
  if (path && !path.startsWith('/') && !path.startsWith('http')) {
    await service.storage.from(ADDITIONS_BUCKET).remove([path])
  }
  const { error } = await service.from('addition_field_options').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/additions')
  return { ok: true }
}

/** Persist a new order for a field: `orderedIds` is the desired top-to-bottom order. */
export async function reorderAdditionOptions(
  fieldKey: string,
  orderedIds: string[],
): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!FIELD_KEYS.has(fieldKey)) return { error: 'Unknown field' }
  const service = createServiceClient()
  // Sequential updates — the lists are tiny (≤20 rows).
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await service
      .from('addition_field_options')
      .update({ sort_order: i + 1 })
      .eq('id', orderedIds[i])
      .eq('field_key', fieldKey)
    if (error) return { error: error.message }
  }
  revalidatePath('/admin/additions')
  return { ok: true }
}

/** Upload (or replace) an option's image into the public `additions` bucket. */
export async function uploadAdditionOptionImage(
  form: FormData,
): Promise<{ ok?: boolean; path?: string; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const id = String(form.get('id') || '')
  const file = form.get('file') as File | null
  if (!id || !file) return { error: 'Missing option or file' }
  if (!file.type.startsWith('image/')) return { error: 'File must be an image' }

  const service = createServiceClient()
  const { data: row } = await service
    .from('addition_field_options')
    .select('field_key, image_path')
    .eq('id', id)
    .maybeSingle()
  if (!row) return { error: 'Option not found' }

  // Normalise (white-bg removal + 700px centred square) for consistency with the
  // existing sole images and product pipeline.
  let png: Buffer
  try {
    png = await normalizeToPng(Buffer.from(await file.arrayBuffer()))
  } catch (e) {
    return { error: `Image processing failed: ${(e as Error).message}` }
  }

  const objectName = `${row.field_key}/${id}.png`
  const { error: upErr } = await service.storage
    .from(ADDITIONS_BUCKET)
    .upload(objectName, png, { contentType: 'image/png', upsert: true })
  if (upErr) return { error: upErr.message }

  const { error } = await service.from('addition_field_options').update({ image_path: objectName }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/additions')
  return { ok: true, path: objectName }
}

/** Clear an option's image (removes the bucket object; leaves legacy /soles/ files). */
export async function removeAdditionOptionImage(id: string): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { data: row } = await service.from('addition_field_options').select('image_path').eq('id', id).maybeSingle()
  const path = row?.image_path as string | null | undefined
  if (path && !path.startsWith('/') && !path.startsWith('http')) {
    await service.storage.from(ADDITIONS_BUCKET).remove([path])
  }
  const { error } = await service.from('addition_field_options').update({ image_path: null }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/additions')
  return { ok: true }
}
