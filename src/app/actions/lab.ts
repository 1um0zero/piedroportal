'use server'

// ─────────────────────────────────────────────────────────────────────────────
// LAB approval sheets — server actions.
//   • Admin path  (createSheet / markSent / closeSheet / deleteSheet): piedro_admin
//   • Reviewer path (submitResponse): token-based, service-role client
// See migration 045 and src/lab/registry.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPiedroAdmin } from '@/lib/roles'
import { addWorkingDays } from '@/lib/dispatch'
import { getLabMeta } from '@/lab/registry'
import { notifyResponse } from '@/lib/notify-lab-response'

type Me = { id: string; role: string | null; email: string | null }

async function requireAdmin(): Promise<Me> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isPiedroAdmin(me?.role)) throw new Error('Forbidden')
  return { id: user.id, role: me?.role ?? null, email: user.email ?? null }
}

const todayISO = () => new Date().toISOString().slice(0, 10)

// ── Admin: create a sheet (draft) from a registry lab key ─────────────────────
// `subjectData` is the JSON snapshot the reviewer sees for an 'approval' sheet
// (e.g. the painted maquette). For 'alternatives' labs it is ignored and the
// options are seeded from the registry instead.
export async function createSheet(input: {
  labKey: string; title?: string; intro?: string; reviewerName?: string; reviewerEmail?: string
  subjectData?: unknown
}): Promise<{ id: string }> {
  const me = await requireAdmin()
  const meta = getLabMeta(input.labKey)
  if (!meta) throw new Error('Unknown lab key')
  const kind = meta.kind ?? 'alternatives'

  const service = createServiceClient()
  const { data: sheet, error } = await service.from('lab_sheets').insert({
    lab_key: input.labKey,
    kind,
    title: input.title?.trim() || meta.title,
    intro: input.intro?.trim() || meta.intro || null,
    reviewer_name: input.reviewerName?.trim() || null,
    reviewer_email: input.reviewerEmail?.trim() || null,
    subject_data: kind === 'approval' ? (input.subjectData ?? null) : null,
    created_by: me.id,
  }).select('id').single()
  if (error || !sheet) throw new Error(error?.message ?? 'Insert failed')

  // Only 'alternatives' sheets carry per-option rows.
  if (kind === 'alternatives' && meta.options.length) {
    const options = meta.options.map((o, i) => ({
      sheet_id: sheet.id, opt_key: o.key, title: o.title, subtitle: o.subtitle ?? null, position: i,
    }))
    const { error: optErr } = await service.from('lab_options').insert(options)
    if (optErr) throw new Error(optErr.message)
  }

  revalidatePath('/admin/lab')
  return { id: sheet.id }
}

// ── Admin: mark a sheet as sent (opens the 2-business-day no-login window) ─────
export async function markSent(sheetId: string): Promise<{ openUntil: string }> {
  await requireAdmin()
  // 2 business days = sending day + 1 following working day (weekends + PT holidays).
  const openUntil = addWorkingDays(todayISO(), 1, new Set<string>())
  const service = createServiceClient()
  const { error } = await service.from('lab_sheets')
    .update({ status: 'sent', sent_at: new Date().toISOString(), open_until: openUntil, updated_at: new Date().toISOString() })
    .eq('id', sheetId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/lab')
  revalidatePath(`/admin/lab/${sheetId}`)
  return { openUntil }
}

// ── Admin: close a sheet ──────────────────────────────────────────────────────
export async function closeSheet(sheetId: string, outcome: 'implemented' | 'cancelled'): Promise<void> {
  await requireAdmin()
  const service = createServiceClient()
  const status = outcome === 'implemented' ? 'closed_implemented' : 'closed_cancelled'
  const { error } = await service.from('lab_sheets')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', sheetId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/lab')
  revalidatePath(`/admin/lab/${sheetId}`)
}

export async function deleteSheet(sheetId: string): Promise<void> {
  await requireAdmin()
  const service = createServiceClient()
  const { error } = await service.from('lab_sheets').delete().eq('id', sheetId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/lab')
}

// ── Reviewer: submit verdicts (token path) ────────────────────────────────────
export type VerdictInput = { optKey: string; verdict: 'chosen' | 'option' | 'rejected' | null; comment?: string }

export async function submitResponse(input: {
  token: string; verdicts: VerdictInput[]; overallComment?: string
}): Promise<void> {
  const service = createServiceClient()
  const { data: sheet, error } = await service.from('lab_sheets')
    .select('id, status, open_until, title, reviewer_name').eq('token', input.token).single()
  if (error || !sheet) throw new Error('Sheet not found')
  if (sheet.status.startsWith('closed_')) throw new Error('This sheet is closed')

  // Access gate: after the no-login window, require an authenticated reviewer/admin.
  const open = !!sheet.open_until && todayISO() <= sheet.open_until
  if (!open) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Login required')
  }

  // Save verdicts per option.
  for (const v of input.verdicts) {
    const { error: e } = await service.from('lab_options')
      .update({ verdict: v.verdict, comment: v.comment?.trim() || null })
      .eq('sheet_id', sheet.id).eq('opt_key', v.optKey)
    if (e) throw new Error(e.message)
  }

  const { error: e2 } = await service.from('lab_sheets').update({
    status: 'answered',
    overall_comment: input.overallComment?.trim() || null,
    responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', sheet.id)
  if (e2) throw new Error(e2.message)

  // Notify Jorge (fire-and-forget; never blocks the reviewer).
  notifyResponse(sheet.id).catch(() => {})

  revalidatePath('/admin/lab')
  revalidatePath(`/admin/lab/${sheet.id}`)
}

// ── Single-subject approval (custom-leather etc.) ─────────────────────────────
// Two callers share this:
//   • Reviewer via the token link  → pass { token } (open-window or login gate).
//   • Internal admin in-app         → pass { sheetId } (no email needed).
// Sets a sheet-level verdict (approved/rejected/discussion) + a comment, marks
// the sheet 'answered', and notifies Jorge. The sheet stays until he closes it,
// so an "Em discussão" thread keeps living as 'answered'.
export async function submitApproval(input: {
  token?: string; sheetId?: string
  verdict: 'approved' | 'rejected' | 'discussion'; comment?: string
}): Promise<void> {
  const service = createServiceClient()

  let sheet: { id: string; status: string; open_until: string | null } | null = null
  if (input.sheetId) {
    await requireAdmin()                       // in-app path: any piedro_admin may decide
    const { data } = await service.from('lab_sheets')
      .select('id, status, open_until').eq('id', input.sheetId).single()
    sheet = data
  } else if (input.token) {
    const { data } = await service.from('lab_sheets')
      .select('id, status, open_until').eq('token', input.token).single()
    sheet = data
    // After the no-login window, the token path requires an authenticated session.
    const open = !!sheet?.open_until && todayISO() <= sheet.open_until
    if (sheet && !open) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Login required')
    }
  }
  if (!sheet) throw new Error('Sheet not found')
  if (sheet.status.startsWith('closed_')) throw new Error('This sheet is closed')

  const { error } = await service.from('lab_sheets').update({
    status: 'answered',
    verdict: input.verdict,
    overall_comment: input.comment?.trim() || null,
    responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', sheet.id)
  if (error) throw new Error(error.message)

  notifyResponse(sheet.id).catch(() => {})
  revalidatePath('/admin/lab')
  revalidatePath(`/admin/lab/${sheet.id}`)
}
