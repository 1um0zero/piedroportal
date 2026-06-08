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

function normalizeLabel(label: string | null): string | null {
  const v = (label ?? '').trim().toUpperCase()
  return v || null
}

function revalidate(companyId?: string) {
  revalidatePath('/admin/companies')
  if (companyId) revalidatePath(`/admin/companies/${companyId}`)
  // The catalogue overlay depends on labels — refresh the gallery cache too.
  revalidatePath('/gallery')
}

// ── Company exclusive label ────────────────────────────────────────────────────

/**
 * Set (or clear) the customer "sigla" of a company. The label is unique
 * (case-insensitive) across companies — one label belongs to one company.
 */
export async function updateCompanyExclusiveLabel(
  companyId: string,
  label: string | null,
): Promise<{ ok?: boolean; error?: string }> {
  const authErr = await assertPiedroAdmin()
  if (authErr) return { error: authErr }

  const value = normalizeLabel(label)
  const service = createServiceClient()

  if (value) {
    // Guard against assigning the same label to two companies.
    const { data: clash } = await service
      .from('companies')
      .select('id')
      .ilike('exclusive_label', value)
      .neq('id', companyId)
      .maybeSingle()
    if (clash) return { error: `Label "${value}" is already used by another company` }
  }

  const { error } = await service
    .from('companies')
    .update({ exclusive_label: value })
    .eq('id', companyId)
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
    .update({ exclusive: value ?? '' })
    .eq('style_name', styleName)
  if (error) return { error: error.message }

  revalidate()
  return { ok: true }
}
