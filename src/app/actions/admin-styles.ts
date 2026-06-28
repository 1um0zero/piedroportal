'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'

async function assertBackoffice(): Promise<string | null> {
  const scope = await getAdminScope()
  if (!scope) return 'Not authenticated'
  if (scope.role === 'branch_staff' && !scope.branchId) return 'Not authorized'
  if (scope.readonlyCatalogue) return 'Not authorized'
  return null
}

/** Set the number of leather pieces/colours for a style (model-level). */
export async function setStyleNumColours(styleName: string, n: number | null): Promise<{ error?: string }> {
  const err = await assertBackoffice(); if (err) return { error: err }
  if (n != null && (!Number.isInteger(n) || n < 1 || n > 30)) return { error: 'num_colours must be 1–30' }
  const service = createServiceClient()
  const { error } = await service.from('styles')
    .update({ num_colours: n, updated_at: new Date().toISOString() })
    .eq('style_name', styleName)
  if (error) return { error: error.message }
  revalidatePath('/admin/products/styles')
  return {}
}

/** Upload (or replace) a style's maquette into the public `maquettes` bucket. */
export async function uploadStyleMaquette(form: FormData): Promise<{ error?: string; path?: string }> {
  const err = await assertBackoffice(); if (err) return { error: err }
  const styleName = String(form.get('style_name') || '')
  const file = form.get('file') as File | null
  if (!styleName || !file) return { error: 'Missing style or file' }

  const ext = file.name.toLowerCase().endsWith('.svg') ? 'svg'
            : /\.jpe?g$/i.test(file.name) ? 'jpeg'
            : file.type === 'image/svg+xml' ? 'svg'
            : file.type === 'image/jpeg' ? 'jpeg' : null
  if (!ext) return { error: 'Maquette must be a JPEG or an SVG' }

  const service = createServiceClient()
  const name = `${styleName}.${ext === 'jpeg' ? 'jpg' : 'svg'}`
  const bytes = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await service.storage.from('maquettes')
    .upload(name, bytes, { contentType: ext === 'svg' ? 'image/svg+xml' : 'image/jpeg', upsert: true })
  if (upErr) return { error: upErr.message }

  const { error } = await service.from('styles')
    .update({ maquette: name, maquette_kind: ext, updated_at: new Date().toISOString() })
    .eq('style_name', styleName)
  if (error) return { error: error.message }
  revalidatePath('/admin/products/styles')
  return { path: name }
}
