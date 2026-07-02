import 'server-only'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'
import { getSettings } from '@/lib/settings'
import { MESSAGING_CONFIG } from './config'
import { renderTemplate } from './render'
import type { MessageTemplate, TemplateVars } from './types'

/**
 * Messaging Foundation — programmatic sender.
 *
 * The API any feature calls to send a stored template (order confirmations,
 * approval notices, …) without touching the broadcast machinery. It resolves
 * the sender from app_settings (falling back to env), renders the template with
 * injected variables, and sends one immediate email via Resend.
 *
 *   await sendTemplateEmail('order_confirmation', {
 *     to: client.email, locale: client.locale,
 *     vars: { name: client.name, order_no: order.seq },
 *   })
 */

export interface SendTemplateOpts {
  to: string | string[]
  locale?: string
  vars?: TemplateVars
  cc?: string | string[]
  bcc?: string | string[]
  /** Override the resolved subject (rare — normally comes from the template). */
  subject?: string
}

export async function sendTemplateEmail(
  key: string,
  opts: SendTemplateOpts,
): Promise<{ ok?: true; error?: string }> {
  const service = createServiceClient()
  const { data: tpl } = await service
    .from('message_templates')
    .select('subject, body_html, signature_html, translations, active')
    .eq('key', key).maybeSingle()
  if (!tpl) return { error: `Template "${key}" not found` }
  if (!(tpl as { active: boolean }).active) return { error: `Template "${key}" is inactive` }

  const apiKey = process.env.RESEND_API_KEY
  const cfg = await getSettings([
    MESSAGING_CONFIG.settingsKeys.from,
    MESSAGING_CONFIG.settingsKeys.replyTo,
    MESSAGING_CONFIG.settingsKeys.signatureHtml,
  ])
  const from = cfg[MESSAGING_CONFIG.settingsKeys.from]
  if (!apiKey || !from) return { error: 'Sender (email_from) not configured in back-office settings' }
  const replyTo = cfg[MESSAGING_CONFIG.settingsKeys.replyTo] || undefined
  const globalSignature = cfg[MESSAGING_CONFIG.settingsKeys.signatureHtml] || null

  const rendered = renderTemplate(tpl as Pick<MessageTemplate, 'subject' | 'body_html' | 'signature_html' | 'translations'>, {
    locale: opts.locale,
    vars: opts.vars,
    contactEmail: replyTo ?? from,
    globalSignatureHtml: globalSignature,
  })

  const { error } = await new Resend(apiKey).emails.send({
    from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject ?? rendered.subject,
    html: rendered.html,
    ...(opts.cc ? { cc: Array.isArray(opts.cc) ? opts.cc : [opts.cc] } : {}),
    ...(opts.bcc ? { bcc: Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc] } : {}),
    ...(replyTo ? { replyTo } : {}),
  }).catch((e: Error) => ({ error: { message: e.message } }))

  return error ? { error: String(error.message ?? error) } : { ok: true }
}
