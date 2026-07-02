import 'server-only'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { getSettings } from '@/lib/settings'
import { renderBrandedHtml, sanitizeEmailHtml, htmlToPlainText } from '@/messaging/render'

/**
 * Email campaign processor — drains pending recipients of due campaigns in
 * small, paced batches so bulk sends never burst (spam-filter safe).
 *
 * Pace: one email every PACE_MS (≈1.4/s, under Resend's 2 req/s limit).
 * Each invocation works within a time budget and stops cleanly; the 5-minute
 * Vercel cron picks up whatever remains, so a full-portal blast drips out at
 * a steady, reputation-friendly rate instead of one giant burst.
 *
 * Branding, footer and locales now live in the messaging Foundation config
 * (`@/messaging/config`); the render helpers below are re-exported for the
 * existing callers (admin-email actions, announcements) that import them here.
 */

const PACE_MS = 700

export { sanitizeEmailHtml, htmlToPlainText }

/**
 * Positional wrapper kept for existing callers. Delegates to the shared
 * branded-HTML renderer in `@/messaging/render`.
 */
export function renderCampaignHtml(
  body: string,
  fullName: string | null,
  locale: string,
  contactEmail?: string,
  bodyHtml?: string | null,
  signatureHtml?: string | null,
): string {
  return renderBrandedHtml({ body, bodyHtml, fullName, locale, contactEmail, signatureHtml })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export interface ProcessResult {
  campaignsTouched: number
  sent: number
  failed: number
  remaining: number
  error?: string
}

/**
 * Process due campaigns within `timeBudgetMs`. Safe to call concurrently-ish
 * (each recipient row is flipped from 'pending' before sending, so a cron tick
 * overlapping a manual trigger at worst re-checks an empty queue).
 */
export async function processDueCampaigns(timeBudgetMs = 45_000): Promise<ProcessResult> {
  const deadline = Date.now() + timeBudgetMs
  const service = createServiceClient()
  const result: ProcessResult = { campaignsTouched: 0, sent: 0, failed: 0, remaining: 0 }

  const key = process.env.RESEND_API_KEY
  const cfg = await getSettings(['email_from', 'broadcast_reply_to', 'broadcast_signature_html'])
  const from = cfg.email_from
  if (!key || !from) return { ...result, error: 'Sender (email_from) not configured in back-office settings' }
  const resend = new Resend(key)
  const replyTo = cfg.broadcast_reply_to || undefined
  const signature = cfg.broadcast_signature_html || null

  const { data: due } = await service
    .from('email_campaigns')
    .select('id, subject, body, body_html, translations, audience, extra_to, extra_cc, extra_bcc, status, sent_count, failed_count')
    .in('status', ['scheduled', 'sending'])
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(3)

  for (const camp of due ?? []) {
    if (Date.now() > deadline) break
    result.campaignsTouched++
    if (camp.status === 'scheduled') {
      await service.from('email_campaigns')
        .update({ status: 'sending', started_at: new Date().toISOString() })
        .eq('id', camp.id).eq('status', 'scheduled')
    }

    let sent = 0, failed = 0
    while (Date.now() + PACE_MS < deadline) {
      const { data: batch } = await service
        .from('email_campaign_recipients')
        .select('id, email, full_name, locale')
        .eq('campaign_id', camp.id).eq('status', 'pending')
        .limit(10)
      if (!batch?.length) break

      for (const r of batch) {
        if (Date.now() + PACE_MS > deadline) break
        // Claim the row first so an overlapping run never double-sends.
        const { data: claimed } = await service
          .from('email_campaign_recipients')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', r.id).eq('status', 'pending')
          .select('id').maybeSingle()
        if (!claimed) continue

        // Per-locale variant when the campaign carries translations; original otherwise.
        const variants = camp.translations as Record<string, { subject?: string; body?: string; body_html?: string }> | null
        const variant = variants?.[r.locale]
        const subject = variant?.subject || camp.subject
        const html = renderCampaignHtml(
          variant?.body || camp.body, r.full_name, r.locale, replyTo ?? from,
          variant?.body_html || camp.body_html, signature)

        // Header addressing: ONE USER goes in To; bulk audiences put the
        // recipient in Bcc (To = sender address) so their address never shows.
        // Campaign-level extra To/Cc/Bcc are added to every message.
        const split = (s: string | null) => (s ?? '').split(',').map(x => x.trim()).filter(Boolean)
        const extraTo = split(camp.extra_to), extraCc = split(camp.extra_cc), extraBcc = split(camp.extra_bcc)
        const fromAddr = from.match(/<([^>]+)>/)?.[1] ?? from
        const isBulk = camp.audience !== 'user'
        const to  = isBulk ? (extraTo.length ? extraTo : [replyTo ?? fromAddr]) : [r.email, ...extraTo]
        const bcc = isBulk ? [r.email, ...extraBcc] : extraBcc

        const { error } = await resend.emails.send({
          from, to, subject, html,
          ...(extraCc.length ? { cc: extraCc } : {}),
          ...(bcc.length ? { bcc } : {}),
          ...(replyTo ? { replyTo } : {}),
        }).catch((e: Error) => ({ error: { message: e.message } }))

        if (error) {
          failed++
          await service.from('email_campaign_recipients')
            .update({ status: 'failed', error: String(error.message ?? error).slice(0, 500), sent_at: null })
            .eq('id', r.id)
        } else {
          sent++
        }
        await sleep(PACE_MS)
      }
    }

    const { count: remaining } = await service
      .from('email_campaign_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', camp.id).eq('status', 'pending')

    const done = (remaining ?? 0) === 0
    await service.from('email_campaigns').update({
      sent_count: (camp.sent_count ?? 0) + sent,
      failed_count: (camp.failed_count ?? 0) + failed,
      ...(done ? { status: 'sent', finished_at: new Date().toISOString() } : {}),
    }).eq('id', camp.id)

    result.sent += sent
    result.failed += failed
    result.remaining += remaining ?? 0
  }

  return result
}
