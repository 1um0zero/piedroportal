import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { MESSAGING_CONFIG } from './config'
import { sanitizeEmailHtml } from './render'
import type { TemplateVariant } from './types'

/**
 * Messaging Foundation — AI translation of an email subject + rich HTML body
 * into the project's locales. Brand voice, model and locale names come from
 * `@/messaging/config`. The caller always reviews/edits variants before use —
 * nothing is sent automatically.
 */
export async function proposeEmailTranslations(
  subject: string,
  bodyHtml: string,
  sourceLocale: string,
  targetLocales: string[],
): Promise<{ translations?: Record<string, TemplateVariant>; error?: string }> {
  const { localeNames, aiBrandContext, aiModel } = MESSAGING_CONFIG
  if (!subject.trim() || !bodyHtml.trim()) return { error: 'Subject and body are required' }
  const targets = [...new Set(targetLocales)].filter(l => localeNames[l] && l !== sourceLocale)
  if (!targets.length) return { error: 'No target languages' }
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'ANTHROPIC_API_KEY not configured' }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const targetList = targets.map(l => `"${l}" (${localeNames[l]})`).join(', ')
  try {
    const msg = await client.messages.create({
      model: aiModel,
      max_tokens: 16000,
      system: `You translate marketing/transactional emails for ${aiBrandContext}.
Translate the given email subject and HTML body from ${localeNames[sourceLocale] ?? sourceLocale} into each requested language.
Rules:
- Preserve the HTML structure, tags and attributes EXACTLY — translate only human-readable text content.
- Keep any {{placeholder}} tokens (double curly braces) untouched wherever they appear.
- Do not translate URLs, email addresses, product references or brand names.
- Use natural, professional business tone.
Respond with ONLY a JSON object of the form {"<locale>": {"subject": "...", "body_html": "..."}} for the requested locales — no markdown fences, no commentary.`,
      messages: [{
        role: 'user',
        content: `Target languages: ${targetList}\n\nSUBJECT:\n${subject}\n\nBODY HTML:\n${bodyHtml}`,
      }],
    })
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('')
    const json = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(json) as Record<string, { subject?: string; body_html?: string }>
    const out: Record<string, TemplateVariant> = {}
    for (const l of targets) {
      const v = parsed[l]
      if (v?.subject && v?.body_html) out[l] = { subject: v.subject, body_html: sanitizeEmailHtml(v.body_html) }
    }
    if (!Object.keys(out).length) return { error: 'Translation returned no usable variants' }
    return { translations: out }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Translation failed' }
  }
}
