'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'

// ── Auth helper (piedro_admin only) ───────────────────────────────────────────

async function assertPiedroAdmin(): Promise<string | null> {
  const scope = await getAdminScope()
  if (!scope) return 'Not authenticated'
  if (scope.role !== 'piedro_admin') return 'Not authorized'
  return null
}

function revalidate(branchId?: string) {
  revalidatePath('/admin/branches')
  if (branchId) revalidatePath(`/admin/branches/${branchId}`)
}

// ── Branch CRUD ───────────────────────────────────────────────────────────────

export interface BranchInput {
  name: string
  code: string | null
  sees_full_catalogue: boolean
  notify_email: string | null
  notify_locale: string | null
}

export async function createBranch(input: BranchInput): Promise<{ id?: string; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }
  if (!input.name?.trim()) return { error: 'Name is required' }

  const service = createServiceClient()
  const id = randomUUID()
  const { error } = await service.from('branches').insert({
    id,
    name: input.name.trim(),
    code: input.code?.trim() || null,
    sees_full_catalogue: input.sees_full_catalogue,
    notify_email: input.notify_email?.trim() || null,
    notify_locale: input.notify_locale || null,
  })
  if (error) return { error: error.message }

  revalidate()
  return { id }
}

export async function updateBranch(
  id: string,
  input: Partial<BranchInput>,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.code !== undefined) patch.code = input.code?.trim() || null
  if (input.sees_full_catalogue !== undefined) patch.sees_full_catalogue = input.sees_full_catalogue
  if (input.notify_email !== undefined) patch.notify_email = input.notify_email?.trim() || null
  if (input.notify_locale !== undefined) patch.notify_locale = input.notify_locale || null

  const service = createServiceClient()
  const { error } = await service.from('branches').update(patch).eq('id', id)
  if (error) return { error: error.message }

  revalidate(id)
  return { ok: true }
}

export async function deleteBranch(id: string): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const service = createServiceClient()
  // Detach staff first (branch_id → null); branch_models cascade on delete.
  await service.from('profiles').update({ branch_id: null }).eq('branch_id', id)
  const { error } = await service.from('branches').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidate()
  return { ok: true }
}

// ── Model assignments ─────────────────────────────────────────────────────────

export async function setBranchModel(
  branchId: string,
  styleName: string,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const service = createServiceClient()
  const { error } = await service
    .from('branch_models')
    .upsert({ branch_id: branchId, style_name: styleName }, { onConflict: 'branch_id,style_name' })
  if (error) return { error: error.message }

  revalidate(branchId)
  return { ok: true }
}

export async function removeBranchModel(
  branchId: string,
  styleName: string,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const service = createServiceClient()
  const { error } = await service
    .from('branch_models')
    .delete()
    .eq('branch_id', branchId)
    .eq('style_name', styleName)
  if (error) return { error: error.message }

  revalidate(branchId)
  return { ok: true }
}

// ── Staff assignment (editable from both sides) ───────────────────────────────

export async function assignUserBranch(
  userId: string,
  branchId: string | null,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const service = createServiceClient()
  const { error } = await service.from('profiles').update({ branch_id: branchId }).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  if (branchId) revalidatePath(`/admin/branches/${branchId}`)
  revalidatePath('/admin/branches')
  return { ok: true }
}
