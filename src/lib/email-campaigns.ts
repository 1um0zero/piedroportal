import 'server-only'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { getSettings } from '@/lib/settings'
import { escapeHtml } from '@/lib/escape-html'

/**
 * Email campaign processor — drains pending recipients of due campaigns in
 * small, paced batches so bulk sends never burst (spam-filter safe).
 *
 * Pace: one email every PACE_MS (≈1.4/s, under Resend's 2 req/s limit).
 * Each invocation works within a time budget and stops cleanly; the 5-minute
 * Vercel cron picks up whatever remains, so a full-portal blast drips out at
 * a steady, reputation-friendly rate instead of one giant burst.
 */

const PACE_MS = 700
const LOCALES = ['en', 'nl', 'fr', 'de'] as const
type Loc = (typeof LOCALES)[number]

const FOOTER: Record<Loc, { reason: string; contact: string }> = {
  en: { reason: 'You are receiving this email because you have a Piedro Portal account.', contact: 'Questions? Reply to this email or contact' },
  nl: { reason: 'U ontvangt deze e-mail omdat u een Piedro Portal-account heeft.', contact: 'Vragen? Beantwoord deze e-mail of neem contact op via' },
  fr: { reason: 'Vous recevez cet e-mail car vous disposez d’un compte Piedro Portal.', contact: 'Des questions ? Répondez à cet e-mail ou contactez' },
  de: { reason: 'Sie erhalten diese E-Mail, weil Sie ein Piedro Portal-Konto haben.', contact: 'Fragen? Antworten Sie auf diese E-Mail oder kontaktieren Sie' },
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://piedroportal.vercel.app'

/** Render the composed plain-text body + branded header/footer into the standard portal email HTML. */
export function renderCampaignHtml(body: string, fullName: string | null, locale: string, contactEmail?: string): string {
  const loc: Loc = LOCALES.includes(locale as Loc) ? (locale as Loc) : 'en'
  const personalized = body.replaceAll('{{name}}', fullName?.trim() || '')
  const paragraphs = escapeHtml(personalized)
    .split(/\n{2,}/)
    .map(p => `<p style="font-size:14px;color:#44403C;line-height:1.6;margin:0 0 16px">${p.replaceAll('\n', '<br/>')}</p>`)
    .join('')
  const f = FOOTER[loc]
  const contact = contactEmail
    ? ` ${f.contact} <a href="mailto:${escapeHtml(contactEmail)}" style="color:#B8975A">${escapeHtml(contactEmail)}</a>.`
    : ''
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
    <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B8975A;margin:0 0 24px">Piedro Portal</p>
    ${paragraphs}
    <div style="border-top:1px solid #E7E5E4;margin-top:32px;padding-top:16px">
      <p style="font-size:11px;color:#A8A29E;line-height:1.6;margin:0">
        ${escapeHtml(f.reason)}${contact}<br/>
        Piedro International · <a href="${SITE}" style="color:#A8A29E">${SITE.replace(/^https?:\/\//, '')}</a>
      </p>
    </div>
  </div>`
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
  const cfg = await getSettings(['email_from', 'broadcast_reply_to'])
  const from = cfg.email_from ?? process.env.EMAIL_FROM
  if (!key || !from) return { ...result, error: 'Resend / EMAIL_FROM not configured' }
  const resend = new Resend(key)
  const replyTo = cfg.broadcast_reply_to || undefined

  const { data: due } = await service
    .from('email_campaigns')
    .select('id, subject, body, status, sent_count, failed_count')
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

        const html = renderCampaignHtml(camp.body, r.full_name, r.locale, replyTo ?? from)
        const { error } = await resend.emails.send({
          from, to: [r.email], subject: camp.subject, html,
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
