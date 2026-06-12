'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { processDueCampaigns, renderCampaignHtml, htmlToPlainText, sanitizeEmailHtml } from '@/lib/email-campaigns'
import { getSettings, setSettings } from '@/lib/settings'
import { Resend } from 'resend'
import Anthropic from '@anthropic-ai/sdk'

/**
 * Admin email broadcast tool — compose once, send to one user, a company's
 * users, or every user attached to a company. Recipients are snapshotted at
 * creation; the throttled processor (lib/email-campaigns) drains them.
 */

type Audience = 'user' | 'company' | 'all_with_company'

/** Normalize a free-typed address list ("a@b.c, d@e.f") → comma string or null. */
function parseEmailList(raw: string | null | undefined): string | null | { error: string } {
  const items = (raw ?? '').split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
  if (!items.length) return null
  for (const e of items) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { error: `Invalid email address: ${e}` }
  }
  return [...new Set(items.map(e => e.toLowerCase()))].join(', ')
}

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
    let q = service
      .from('profiles').select('id, email, full_name, preferred_locale')
      .in('id', userIds.slice(i, i + 200))
    // Bulk audiences are customer-facing: exclude internal roles (admins/staff)
    // even when they have a company assigned. Picking ONE user stays unrestricted.
    if (audience !== 'user') q = q.in('role', ['user', 'company_admin'])
    const { data, error } = await q
    if (error) return { error: error.message }
    for (const p of data ?? []) {
      if (!p.email) continue
      out.push({ user_id: p.id, email: p.email, full_name: p.full_name, locale: p.preferred_locale ?? 'en' })
    }
  }
  if (!out.length) return { error: 'No recipients with an email address' }
  return out
}

/** Preview how many people a given audience reaches (composer live counter + per-locale split). */
export async function previewAudience(
  audience: Audience,
  targetUserId: string | null,
  targetCompanyId: string | null,
): Promise<{ count?: number; byLocale?: Record<string, number>; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const r = await resolveRecipients(audience, targetUserId, targetCompanyId)
  if ('error' in r) return { error: r.error }
  const byLocale: Record<string, number> = {}
  for (const rec of r) byLocale[rec.locale] = (byLocale[rec.locale] ?? 0) + 1
  return { count: r.length, byLocale }
}

const LOCALE_NAMES: Record<string, string> = { en: 'English', nl: 'Dutch', fr: 'French', de: 'German' }

export interface CampaignVariant { subject: string; bodyHtml: string }

/**
 * AI-propose translations of the composed email (subject + rich HTML body)
 * into the recipients' languages. The admin reviews/edits each variant in the
 * composer before sending — nothing is sent automatically.
 */
export async function proposeTranslations(
  subject: string,
  bodyHtml: string,
  sourceLocale: string,
  targetLocales: string[],
): Promise<{ translations?: Record<string, CampaignVariant>; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!subject.trim() || !bodyHtml.trim()) return { error: 'Subject and body are required' }
  const targets = [...new Set(targetLocales)].filter(l => LOCALE_NAMES[l] && l !== sourceLocale)
  if (!targets.length) return { error: 'No target languages' }
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'ANTHROPIC_API_KEY not configured' }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const targetList = targets.map(l => `"${l}" (${LOCALE_NAMES[l]})`).join(', ')
  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      system: `You translate marketing/transactional emails for Piedro International, a Dutch orthopaedic footwear company (B2B portal for clinics).
Translate the given email subject and HTML body from ${LOCALE_NAMES[sourceLocale] ?? sourceLocale} into each requested language.
Rules:
- Preserve the HTML structure, tags and attributes EXACTLY — translate only human-readable text content.
- Keep the literal placeholder {{name}} untouched wherever it appears.
- Do not translate URLs, email addresses, product references or the brand name "Piedro".
- Use natural, professional business tone appropriate for healthcare professionals.
Respond with ONLY a JSON object of the form {"<locale>": {"subject": "...", "body_html": "..."}} for the requested locales — no markdown fences, no commentary.`,
      messages: [{
        role: 'user',
        content: `Target languages: ${targetList}\n\nSUBJECT:\n${subject}\n\nBODY HTML:\n${bodyHtml}`,
      }],
    })
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('')
    const json = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(json) as Record<string, { subject?: string; body_html?: string }>
    const out: Record<string, CampaignVariant> = {}
    for (const l of targets) {
      const v = parsed[l]
      if (v?.subject && v?.body_html) out[l] = { subject: v.subject, bodyHtml: sanitizeEmailHtml(v.body_html) }
    }
    if (!Object.keys(out).length) return { error: 'Translation returned no usable variants' }
    return { translations: out }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Translation failed' }
  }
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
  extraTo?: string
  extraCc?: string
  extraBcc?: string
  translations?: Record<string, CampaignVariant> // per-locale variants (admin-reviewed)
}): Promise<{ ok?: boolean; error?: string; recipients?: number }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const subject = input.subject.trim()
  const bodyHtml = input.bodyHtml.trim()
  const body = htmlToPlainText(bodyHtml)
  if (!subject || (!body && !/<img\b/i.test(bodyHtml))) return { error: 'Subject and body are required' }

  const extraTo = parseEmailList(input.extraTo)
  const extraCc = parseEmailList(input.extraCc)
  const extraBcc = parseEmailList(input.extraBcc)
  for (const v of [extraTo, extraCc, extraBcc]) {
    if (v && typeof v === 'object') return { error: v.error }
  }

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : new Date()
  if (isNaN(scheduledAt.getTime())) return { error: 'Invalid schedule time' }

  const recipients = await resolveRecipients(input.audience, input.targetUserId, input.targetCompanyId)
  if ('error' in recipients) return { error: recipients.error }

  // Per-locale variants: sanitize and derive the plain-text fallback server-side.
  let translations: Record<string, { subject: string; body: string; body_html: string }> | null = null
  for (const [loc, v] of Object.entries(input.translations ?? {})) {
    if (!['en', 'nl', 'fr', 'de'].includes(loc)) continue
    const vSubject = v.subject.trim()
    const vHtml = sanitizeEmailHtml(v.bodyHtml.trim())
    const vBody = htmlToPlainText(vHtml)
    if (!vSubject || (!vBody && !/<img\b/i.test(vHtml))) continue
    translations = translations ?? {}
    translations[loc] = { subject: vSubject, body: vBody, body_html: vHtml }
  }

  const service = createServiceClient()
  const { data: camp, error: campErr } = await service.from('email_campaigns').insert({
    subject, body, body_html: bodyHtml, translations,
    extra_to: extraTo as string | null, extra_cc: extraCc as string | null, extra_bcc: extraBcc as string | null,
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
