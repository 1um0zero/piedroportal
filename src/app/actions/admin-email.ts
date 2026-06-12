'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { processDueCampaigns, renderCampaignHtml, htmlToPlainText, sanitizeEmailHtml } from '@/lib/email-campaigns'
import { getSettings, setSettings } from '@/lib/settings'
import { Resend } from 'resend'

/**
 * Admin email broadcast tool — compose once, send to one user, a company's
 * users, or every user attached to a company. Recipients are snapshotted at
 * creation; the throttled processor (lib/email-campaigns) drains them.
 */

type Audience = 'user' | 'company' | 'all_with_company'

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const scope = await getAdminScope()
  if (!scope || !isPiedroAdmin(scope.role)) return { error: 'Not authorized' }
  return { userId: scope.userId }
}

interface RecipientRow { user_id: string; email: string; full_name: string | null; locale: string }

/** Resolve the audience to a deduplicated recipient list (user_companies is the source of truth). */
async function resolveRecipients(
  audience: Audience,
  targetUserId: string | null,
  targetCompanyId: string | null,
): Promise<RecipientRow[] | { error: string }> {
  const service = createServiceClient()

  let userIds: string[] | null = null // null = single-user path below
  if (audience === 'user') {
    if (!targetUserId) return { error: 'No user selected' }
    userIds = [targetUserId]
  } else if (audience === 'company') {
    if (!targetCompanyId) return { error: 'No company selected' }
    const { data, error } = await service
      .from('user_companies').select('user_id').eq('company_id', targetCompanyId)
    if (error) return { error: error.message }
    userIds = [...new Set((data ?? []).map(r => r.user_id as string))]
  } else {
    const { data, error } = await service.from('user_companies').select('user_id')
    if (error) return { error: error.message }
    userIds = [...new Set((data ?? []).map(r => r.user_id as string))]
  }
  if (!userIds.length) return { error: 'No recipients found' }

  const out: RecipientRow[] = []
  // Chunked .in() — Supabase URLs choke on very long id lists.
  for (let i = 0; i < userIds.length; i += 200) {
    const { data, error } = await service
      .from('profiles').select('id, email, full_name, preferred_locale')
      .in('id', userIds.slice(i, i + 200))
    if (error) return { error: error.message }
    for (const p of data ?? []) {
      if (!p.email) continue
      out.push({ user_id: p.id, email: p.email, full_name: p.full_name, locale: p.preferred_locale ?? 'en' })
    }
  }
  if (!out.length) return { error: 'No recipients with an email address' }
  return out
}

/** Preview how many people a given audience reaches (composer live counter). */
export async function previewAudience(
  audience: Audience,
  targetUserId: string | null,
  targetCompanyId: string | null,
): Promise<{ count?: number; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const r = await resolveRecipients(audience, targetUserId, targetCompanyId)
  if ('error' in r) return { error: r.error }
  return { count: r.length }
}

/** Send a single test email (rendered exactly like the real one) to the admin's own address. */
export async function sendTestEmail(subject: string, bodyHtml: string): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const body = htmlToPlainText(bodyHtml)
  // An image-only body (e.g. a pasted flyer) is valid content too.
  if (!subject.trim() || (!body.trim() && !/<img\b/i.test(bodyHtml))) return { error: 'Subject and body are required' }

  const service = createServiceClient()
  const { data: me } = await service
    .from('profiles').select('email, full_name, preferred_locale').eq('id', auth.userId).single()
  if (!me?.email) return { error: 'Your profile has no email address' }

  const key = process.env.RESEND_API_KEY
  const cfg = await getSettings(['email_from', 'broadcast_reply_to', 'broadcast_signature_html'])
  const from = cfg.email_from ?? process.env.EMAIL_FROM
  if (!key || !from) return { error: 'Resend / EMAIL_FROM not configured' }

  const html = renderCampaignHtml(body, me.full_name, me.preferred_locale ?? 'en',
    cfg.broadcast_reply_to || from, bodyHtml, cfg.broadcast_signature_html || null)
  const { error } = await new Resend(key).emails.send({
    from, to: [me.email], subject: `[TEST] ${subject}`, html,
    ...(cfg.broadcast_reply_to ? { replyTo: cfg.broadcast_reply_to } : {}),
  })
  return error ? { error: error.message } : { ok: true }
}

/**
 * Create a campaign: snapshot recipients now, schedule the send window.
 * If the window is already open, kick a first processing pass inline so
 * small sends (one user / one company) complete immediately.
 */
export async function createCampaign(input: {
  subject: string
  bodyHtml: string // rich-editor HTML; plain-text version is derived server-side
  audience: Audience
  targetUserId: string | null
  targetCompanyId: string | null
  scheduledAt: string | null // ISO; null = now
}): Promise<{ ok?: boolean; error?: string; recipients?: number }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const subject = input.subject.trim()
  const bodyHtml = input.bodyHtml.trim()
  const body = htmlToPlainText(bodyHtml)
  if (!subject || (!body && !/<img\b/i.test(bodyHtml))) return { error: 'Subject and body are required' }

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : new Date()
  if (isNaN(scheduledAt.getTime())) return { error: 'Invalid schedule time' }

  const recipients = await resolveRecipients(input.audience, input.targetUserId, input.targetCompanyId)
  if ('error' in recipients) return { error: recipients.error }

  const service = createServiceClient()
  const { data: camp, error: campErr } = await service.from('email_campaigns').insert({
    subject, body, body_html: bodyHtml,
    audience: input.audience,
    target_user_id: input.audience === 'user' ? input.targetUserId : null,
    target_company_id: input.audience === 'company' ? input.targetCompanyId : null,
    scheduled_at: scheduledAt.toISOString(),
    total_recipients: recipients.length,
    created_by: auth.userId,
  }).select('id').single()
  if (campErr || !camp) return { error: campErr?.message ?? 'Insert failed' }

  for (let i = 0; i < recipients.length; i += 500) {
    const { error } = await service.from('email_campaign_recipients').insert(
      recipients.slice(i, i + 500).map(r => ({ campaign_id: camp.id, ...r })),
    )
    if (error) {
      await service.from('email_campaigns').delete().eq('id', camp.id)
      return { error: error.message }
    }
  }

  // Send window already open → process a first slice inline (~25 emails);
  // anything left drips out via the 5-minute cron.
  if (scheduledAt.getTime() <= Date.now()) {
    await processDueCampaigns(20_000).catch(() => {})
  }

  revalidatePath('/admin/email')
  return { ok: true, recipients: recipients.length }
}

/** Save the shared HTML signature appended to every broadcast (app_settings). */
export async function saveSignature(html: string): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const { error } = await setSettings({ broadcast_signature_html: sanitizeEmailHtml(html.trim()) }, auth.userId)
  if (error) return { error }
  revalidatePath('/admin/email')
  return { ok: true }
}

/** Cancel a campaign that hasn't finished — pending recipients are simply never sent. */
export async function cancelCampaign(id: string): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { error } = await service.from('email_campaigns')
    .update({ status: 'cancelled', finished_at: new Date().toISOString() })
    .eq('id', id).in('status', ['scheduled', 'sending'])
  if (error) return { error: error.message }
  revalidatePath('/admin/email')
  return { ok: true }
}

/** Manual "process now" — lets an admin push a stuck/queued campaign forward. */
export async function processNow(): Promise<{ ok?: boolean; error?: string; sent?: number; remaining?: number }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const r = await processDueCampaigns(25_000)
  revalidatePath('/admin/email')
  return r.error ? { error: r.error } : { ok: true, sent: r.sent, remaining: r.remaining }
}
