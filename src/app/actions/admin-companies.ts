'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'

// ── Auth helper (piedro_admin only) ───────────────────────────────────────────

async function assertPiedroAdmin(): Promise<string | null> {
  const scope = await getAdminScope()
  if (!scope) return 'Not authenticated'
  if (!isPiedroAdmin(scope.role)) return 'Not authorized'
  return null
}

function normalizeLabel(label: string | null): string {
  return (label ?? '').trim().toUpperCase()
}

function revalidate(companyId?: string) {
  revalidatePath('/admin/companies')
  if (companyId) revalidatePath(`/admin/companies/${companyId}`)
  // The catalogue overlay depends on labels — refresh the gallery cache too.
  revalidatePath('/gallery')
}

// ── Company exclusive siglas (N:N company_exclusives — the source of truth) ─────
// A company may hold SEVERAL siglas (e.g. "LIV" + "ZSM"); unlike a sigla→model
// tag, a sigla is shared by many companies (the Livingstone group). The legacy
// single `companies.exclusive_label` field is deprecated (read-only fallback in
// getUserExclusiveLabels) and no longer written here.

/** Add a sigla to a company (idempotent, uppercased). */
export async function addCompanyExclusiveSigla(
  companyId: string,
  label: string | null,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const value = normalizeLabel(label)
  if (!value) return { error: 'Sigla is required' }

  const service = createServiceClient()
  const { data: existing } = await service
    .from('company_exclusives')
    .select('label')
    .eq('company_id', companyId)
    .ilike('label', value)
    .maybeSingle()
  if (existing) return { ok: true } // already present

  const { error } = await service
    .from('company_exclusives')
    .insert({ company_id: companyId, label: value })
  if (error) return { error: error.message }

  revalidate(companyId)
  return { ok: true }
}

/** Remove a sigla from a company. */
export async function removeCompanyExclusiveSigla(
  companyId: string,
  label: string,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const value = normalizeLabel(label)
  if (!value) return { error: 'Sigla is required' }

  const service = createServiceClient()
  const { error } = await service
    .from('company_exclusives')
    .delete()
    .eq('company_id', companyId)
    .ilike('label', value)
  if (error) return { error: error.message }

  revalidate(companyId)
  return { ok: true }
}

// ── Company order-email Cc/Bcc ──────────────────────────────────────────────────

/** Set the customer-level Cc/Bcc applied to order confirmations for this company. */
export async function updateCompanyNotify(
  companyId: string,
  fields: { notify_cc?: string; notify_bcc?: string },
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const patch: Record<string, string | null> = {}
  if (fields.notify_cc  !== undefined) patch.notify_cc  = fields.notify_cc.trim()  || null
  if (fields.notify_bcc !== undefined) patch.notify_bcc = fields.notify_bcc.trim() || null

  const service = createServiceClient()
  const { error } = await service.from('companies').update(patch).eq('id', companyId)
  if (error) return { error: error.message }

  revalidate(companyId)
  return { ok: true }
}

// ── Model ↔ company exclusivity (applies to the whole model = all colours) ──────

/**
 * Mark a model (style_name) as exclusive to `label`, or clear it (label = null).
 * Writes `exclusive` on every product row of that style.
 */
export async function setModelExclusiveLabel(
  styleName: string,
  label: string | null,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }
  if (!styleName?.trim()) return { error: 'style_name is required' }

  const value = normalizeLabel(label)
  const service = createServiceClient()
  const { error } = await service
    .from('products')
    .update({ exclusive: value })
    .eq('style_name', styleName)
  if (error) return { error: error.message }

  revalidate()
  return { ok: true }
}
