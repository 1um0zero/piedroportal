'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { exclusiveTokens } from '@/lib/exclusive'
import { logDeletion } from '@/lib/admin/audit'

// ── Auth helper (piedro_admin only) ───────────────────────────────────────────

async function assertPiedroAdmin(): Promise<string | null> {
  const scope = await getAdminScope()
  if (!scope) return 'Not authenticated'
  if (!isPiedroAdmin(scope.role)) return 'Not authorized'
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
  handles_unassigned_clients?: boolean
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
    handles_unassigned_clients: input.handles_unassigned_clients ?? false,
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
  if (input.handles_unassigned_clients !== undefined) patch.handles_unassigned_clients = input.handles_unassigned_clients
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

  // Attribute the deletion (WHO) — refuse if it can't be recorded (no invisible deletes).
  const scope = await getAdminScope()
  const { data: br } = await service.from('branches').select('name').eq('id', id).single()
  const logged = await logDeletion({
    actorId: scope?.userId ?? null, actorRole: scope?.role ?? null,
    table: 'branches', recordId: id, label: br?.name ?? null,
  })
  if (!logged) return { error: 'Branch could not be deleted (audit failed)' }

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

// ── Client (company) assignment — branch_companies ─────────────────────────────
// The clients a branch admin may order/view on behalf of.

export async function addBranchCompany(
  branchId: string,
  companyId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const service = createServiceClient()
  const { error } = await service
    .from('branch_companies')
    .upsert({ branch_id: branchId, company_id: companyId }, { onConflict: 'branch_id,company_id' })
  if (error) return { error: error.message }

  revalidate(branchId)
  return { ok: true }
}

export async function removeBranchCompany(
  branchId: string,
  companyId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const service = createServiceClient()
  const { error } = await service
    .from('branch_companies')
    .delete()
    .eq('branch_id', branchId)
    .eq('company_id', companyId)
  if (error) return { error: error.message }

  revalidate(branchId)
  return { ok: true }
}

// ── Branch admin assignment — branch_admins (N:N) ──────────────────────────────
// A branch admin may create/view orders on behalf of the branch's clients. We
// also stamp profiles.role='branch_admin' as the client-side label/gate, and
// clear it when the user no longer administers any branch (unless they hold a
// higher role we must not clobber).

export async function addBranchAdmin(
  branchId: string,
  userId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const service = createServiceClient()
  const { error } = await service
    .from('branch_admins')
    .upsert({ branch_id: branchId, user_id: userId }, { onConflict: 'branch_id,user_id' })
  if (error) return { error: error.message }

  // Label the user (only if they're a plain user/branch_staff — never downgrade
  // a company_admin/piedro_admin/super_admin).
  const { data: prof } = await service.from('profiles').select('role').eq('id', userId).single()
  if (prof && (prof.role === 'user' || prof.role === 'branch_staff' || !prof.role)) {
    const { error: roleErr } = await service.from('profiles')
      .update({ role: 'branch_admin', branch_id: null }).eq('id', userId)
    // Surface (don't swallow) — e.g. a role CHECK constraint missing 'branch_admin'
    // would otherwise leave the user on their old role and locked out of orders.
    if (roleErr) return { error: `Branch admin linked, but role not set: ${roleErr.message}` }
  }

  revalidate(branchId)
  revalidatePath('/admin/users')
  return { ok: true }
}

// ── Token-scoped branch (e.g. UK): Style.Colour + client exclusivity ───────────
// A token-scoped branch (branches.exclusive_label, e.g. 'UK') manages exclusivity
// directly: assigning a Style.Colour stamps products.exclusive with the sigla;
// assigning a client stamps companies.exclusive_label (+ sees_general_catalogue)
// AND links branch_companies so the branch's staff order on its behalf. The token
// is additive — a row may carry several siglas (e.g. 'LIV UK').

async function branchToken(branchId: string): Promise<string | null> {
  const service = createServiceClient()
  const { data } = await service.from('branches').select('exclusive_label').eq('id', branchId).single()
  const t = (data?.exclusive_label ?? '').trim().toUpperCase()
  return t || null
}

/** Re-serialise a token set, with `token` added or removed. Returns null when empty. */
function applyToken(current: string | null | undefined, token: string, on: boolean): string | null {
  const toks = new Set(exclusiveTokens(current))
  if (on) toks.add(token); else toks.delete(token)
  return toks.size ? [...toks].join(' ') : null
}

/** Add/remove the branch sigla on a batch of Style.Colour rows (by colour_id). */
export async function setBranchColoursExclusive(
  branchId: string,
  colourIds: string[],
  on: boolean,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }
  const token = await branchToken(branchId)
  if (!token) return { error: 'Branch is not token-scoped' }
  if (!colourIds.length) return { ok: true }

  const service = createServiceClient()
  const { data: rows, error } = await service
    .from('products').select('id, exclusive').in('colour_id', colourIds)
  if (error) return { error: error.message }

  for (const r of (rows ?? []) as { id: string; exclusive: string | null }[]) {
    const next = applyToken(r.exclusive, token, on)
    const { error: upErr } = await service.from('products').update({ exclusive: next }).eq('id', r.id)
    if (upErr) return { error: upErr.message }
  }

  revalidate(branchId)
  revalidatePath('/admin/products')
  revalidatePath('/gallery')
  return { ok: true }
}

/** Assign a client to the branch: stamp the sigla (+ sees general) and link it. */
export async function assignBranchExclusiveClient(
  branchId: string,
  companyId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }
  const token = await branchToken(branchId)
  if (!token) return { error: 'Branch is not token-scoped' }

  const service = createServiceClient()
  const { data: company } = await service
    .from('companies').select('exclusive_label').eq('id', companyId).single()
  const nextLabel = applyToken(company?.exclusive_label, token, true)
  const { error: cErr } = await service.from('companies')
    .update({ exclusive_label: nextLabel, sees_general_catalogue: true }).eq('id', companyId)
  if (cErr) return { error: cErr.message }

  // On-behalf: the branch's staff register orders for this client.
  const { error: lErr } = await service.from('branch_companies')
    .upsert({ branch_id: branchId, company_id: companyId }, { onConflict: 'branch_id,company_id' })
  if (lErr) return { error: lErr.message }

  revalidate(branchId)
  revalidatePath('/admin/companies')
  return { ok: true }
}

/** Unassign a client: drop the sigla and the on-behalf link (keeps other siglas). */
export async function removeBranchExclusiveClient(
  branchId: string,
  companyId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }
  const token = await branchToken(branchId)
  if (!token) return { error: 'Branch is not token-scoped' }

  const service = createServiceClient()
  const { data: company } = await service
    .from('companies').select('exclusive_label').eq('id', companyId).single()
  const nextLabel = applyToken(company?.exclusive_label, token, false)
  const { error: cErr } = await service.from('companies')
    .update({ exclusive_label: nextLabel }).eq('id', companyId)
  if (cErr) return { error: cErr.message }

  await service.from('branch_companies').delete().eq('branch_id', branchId).eq('company_id', companyId)

  revalidate(branchId)
  revalidatePath('/admin/companies')
  return { ok: true }
}

export async function removeBranchAdmin(
  branchId: string,
  userId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const service = createServiceClient()
  const { error } = await service
    .from('branch_admins')
    .delete()
    .eq('branch_id', branchId)
    .eq('user_id', userId)
  if (error) return { error: error.message }

  // If the user no longer administers ANY branch, drop the branch_admin label
  // back to a plain user (leave higher roles untouched).
  const { count } = await service
    .from('branch_admins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if ((count ?? 0) === 0) {
    const { data: prof } = await service.from('profiles').select('role, branch_id').eq('id', userId).single()
    if (prof?.role === 'branch_admin') {
      // A user still attached to a branch (branch_id) is branch staff; only a
      // fully-detached one falls back to a plain user.
      await service.from('profiles')
        .update({ role: prof.branch_id ? 'branch_staff' : 'user' }).eq('id', userId)
    }
  }

  revalidate(branchId)
  revalidatePath('/admin/users')
  return { ok: true }
}
