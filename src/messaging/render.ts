import { escapeHtml } from '@/lib/escape-html'
import { MESSAGING_CONFIG, coerceLocale } from './config'
import type { MessageTemplate, RenderedMessage, TemplateVars } from './types'

/**
 * Messaging Foundation — pure rendering layer.
 *
 * No I/O: turns raw admin-authored HTML (+ variables) into the branded,
 * sanitized email that goes on the wire. Shared by the broadcast tool, the
 * message-templates configurator, and any feature that sends a template.
 */

/**
 * Conservative e-mail HTML sanitizer. Authors are trusted admins, so this is a
 * guard rail, not a security boundary: strips active content
 * (script/style/iframe/forms), inline event handlers and javascript: URLs.
 */
export function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[\s\S]*?(<\s*\/\s*\1\s*>|\/?>)/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'\s>]*\2/gi, '$1="#"')
}

/** Plain-text version of an HTML body (history list / fallback). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Replace `{{ variable }}` placeholders with supplied values. Unknown
 * placeholders are left untouched (so a half-filled template still previews).
 * `escape: true` HTML-escapes each value — always use it when injecting into
 * an HTML body; leave it off for plain-text subjects.
 */
export function injectVars(text: string, vars: TemplateVars, opts: { escape?: boolean } = {}): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) => {
    const v = vars[key]
    if (v == null) return whole
    return opts.escape ? escapeHtml(String(v)) : String(v)
  })
}

/**
 * Wrap composed body (+ optional signature) in the standard branded email
 * shell. `bodyHtml` (rich editor) wins over the plain-text `body`; images in it
 * must already be hosted URLs (the editor uploads pasted images).
 */
export function renderBrandedHtml(opts: {
  body?: string
  bodyHtml?: string | null
  fullName?: string | null
  locale?: string
  contactEmail?: string
  signatureHtml?: string | null
}): string {
  const { brandName, orgName, siteUrl, accentColor, footer, locales } = MESSAGING_CONFIG
  const loc = coerceLocale(opts.locale)
  const name = opts.fullName?.trim() || ''

  let content: string
  if (opts.bodyHtml?.trim()) {
    content = `<div style="font-size:14px;color:#44403C;line-height:1.6">${
      sanitizeEmailHtml(opts.bodyHtml).replaceAll('{{name}}', escapeHtml(name))
    }</div>`
  } else {
    content = escapeHtml((opts.body ?? '').replaceAll('{{name}}', name))
      .split(/\n{2,}/)
      .map(p => `<p style="font-size:14px;color:#44403C;line-height:1.6;margin:0 0 16px">${p.replaceAll('\n', '<br/>')}</p>`)
      .join('')
  }

  const signature = opts.signatureHtml?.trim()
    ? `<div style="margin-top:24px;font-size:13px;color:#44403C;line-height:1.6">${sanitizeEmailHtml(opts.signatureHtml)}</div>`
    : ''
  const f = footer[loc] ?? footer[locales[0]]
  const contact = opts.contactEmail
    ? ` ${f.contact} <a href="mailto:${escapeHtml(opts.contactEmail)}" style="color:${accentColor}">${escapeHtml(opts.contactEmail)}</a>.`
    : ''
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
    <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${accentColor};margin:0 0 24px">${escapeHtml(brandName)}</p>
    ${content}
    ${signature}
    <div style="border-top:1px solid #E7E5E4;margin-top:32px;padding-top:16px">
      <p style="font-size:11px;color:#A8A29E;line-height:1.6;margin:0">
        ${escapeHtml(f.reason)}${contact}<br/>
        ${escapeHtml(orgName)} · <a href="${siteUrl}" style="color:#A8A29E">${siteUrl.replace(/^https?:\/\//, '')}</a>
      </p>
    </div>
  </div>`
}

/**
 * Render a stored template for one recipient/locale: pick the locale variant,
 * inject variables, wrap in the branded shell. The core of every programmatic
 * consumer — pass `{{name}}` (or any declared variable) via `vars`.
 */
export function renderTemplate(
  template: Pick<MessageTemplate, 'subject' | 'body_html' | 'signature_html' | 'translations'>,
  opts: { locale?: string; vars?: TemplateVars; contactEmail?: string; globalSignatureHtml?: string | null } = {},
): RenderedMessage {
  const loc = coerceLocale(opts.locale)
  const vars = opts.vars ?? {}
  const variant = template.translations?.[loc]
  const rawSubject = variant?.subject || template.subject
  const rawBody = variant?.body_html || template.body_html

  const subject = injectVars(rawSubject, vars)
  const bodyHtml = injectVars(rawBody, vars, { escape: true })
  // Per-template signature overrides the shared global one when present.
  const sig = template.signature_html?.trim()
    ? injectVars(template.signature_html, vars, { escape: true })
    : opts.globalSignatureHtml ?? null

  const html = renderBrandedHtml({
    bodyHtml,
    fullName: vars.name != null ? String(vars.name) : null,
    locale: loc,
    contactEmail: opts.contactEmail,
    signatureHtml: sig,
  })
  return { subject, html, text: htmlToPlainText(bodyHtml) }
}
