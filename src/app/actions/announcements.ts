'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { sanitizeEmailHtml } from '@/lib/email-campaigns'
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_DISPLAYS,
  ANNOUNCEMENT_LOCALES,
  ANNOUNCEMENT_PLACEMENTS,
  type AnnouncementAudience,
  type AnnouncementDisplay,
  type AnnouncementPlacement,
  type AnnouncementVariant,
} from '@/lib/announcements-types'
import Anthropic from '@anthropic-ai/sdk'

/**
 * Admin CRUD for in-portal announcements + an AI helper that translates the
 * composed message into the other locales (reused pattern from admin-email).
 */

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const scope = await getAdminScope()
  if (!scope || !isPiedroAdmin(scope.role)) return { error: 'Not authorized' }
  return { userId: scope.userId }
}

const hasContent = (html: string) =>
  !!html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() || /<img\b/i.test(html)

export interface SaveAnnouncementInput {
  id?: string
  title: string
  sourceLocale: string
  bodyHtml: string
  translations?: Record<string, AnnouncementVariant>
  displayType: AnnouncementDisplay
  placement: AnnouncementPlacement[]
  audience: AnnouncementAudience
  startsAt: string | null // ISO or null
  endsAt: string | null
  active: boolean
  dismissible: boolean
}

export async function saveAnnouncement(input: SaveAnnouncementInput): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const title = input.title.trim()
  const bodyHtml = sanitizeEmailHtml(input.bodyHtml.trim())
  if (!title) return { error: 'A title is required' }
  if (!hasContent(bodyHtml)) return { error: 'The message body is required' }
  if (!ANNOUNCEMENT_DISPLAYS.includes(input.displayType)) return { error: 'Invalid display type' }

  const placement = [...new Set(input.placement)].filter(p => ANNOUNCEMENT_PLACEMENTS.includes(p))
  if (!placement.length) return { error: 'Pick at least one place where the message appears' }
  if (!ANNOUNCEMENT_AUDIENCES.includes(input.audience)) return { error: 'Invalid audience' }

  const starts = input.startsAt ? new Date(input.startsAt) : null
  const ends = input.endsAt ? new Date(input.endsAt) : null
  if (starts && isNaN(starts.getTime())) return { error: 'Invalid start date' }
  if (ends && isNaN(ends.getTime())) return { error: 'Invalid end date' }
  if (starts && ends && ends.getTime() < starts.getTime()) return { error: 'End date is before the start date' }

  // Per-locale variants: sanitise; drop empty ones.
  let translations: Record<string, AnnouncementVariant> | null = null
  for (const [loc, v] of Object.entries(input.translations ?? {})) {
    if (!ANNOUNCEMENT_LOCALES.includes(loc as typeof ANNOUNCEMENT_LOCALES[number]) || loc === input.sourceLocale) continue
    const vHtml = sanitizeEmailHtml((v.bodyHtml ?? '').trim())
    if (!hasContent(vHtml)) continue
    translations = translations ?? {}
    translations[loc] = { title: v.title?.trim() || undefined, bodyHtml: vHtml }
  }

  const row = {
    title,
    source_locale: input.sourceLocale,
    body_html: bodyHtml,
    translations,
    display_type: input.displayType,
    placement,
    audience: input.audience,
    starts_at: starts ? starts.toISOString() : null,
    ends_at: ends ? ends.toISOString() : null,
    active: input.active,
    dismissible: input.dismissible,
    updated_at: new Date().toISOString(),
  }

  const service = createServiceClient()
  if (input.id) {
    const { error } = await service.from('announcements').update(row).eq('id', input.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await service.from('announcements').insert({ ...row, created_by: auth.userId })
    if (error) return { error: error.message }
  }
  revalidatePath('/admin/announcements')
  return { ok: true }
}

export async function setAnnouncementActive(id: string, active: boolean): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const { error } = await createServiceClient()
    .from('announcements').update({ active, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/announcements')
  return { ok: true }
}

export async function deleteAnnouncement(id: string): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const { error } = await createServiceClient().from('announcements').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/announcements')
  return { ok: true }
}

const LOCALE_NAMES: Record<string, string> = { en: 'English', nl: 'Dutch', fr: 'French', de: 'German' }

/**
 * AI-propose translations of the message (title + rich HTML body) into the other
 * locales. The admin reviews/edits each variant before saving.
 */
export async function proposeAnnouncementTranslations(
  title: string,
  bodyHtml: string,
  sourceLocale: string,
  targetLocales: string[],
): Promise<{ translations?: Record<string, AnnouncementVariant>; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  if (!title.trim() || !hasContent(bodyHtml)) return { error: 'Title and body are required' }
  const targets = [...new Set(targetLocales)].filter(l => LOCALE_NAMES[l] && l !== sourceLocale)
  if (!targets.length) return { error: 'No target languages' }
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'ANTHROPIC_API_KEY not configured' }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const targetList = targets.map(l => `"${l}" (${LOCALE_NAMES[l]})`).join(', ')
  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8000,
      system: `You translate short in-portal announcements for Piedro International, a Dutch orthopaedic footwear company (B2B portal for clinics).
Translate the given announcement title and HTML body from ${LOCALE_NAMES[sourceLocale] ?? sourceLocale} into each requested language.
Rules:
- Preserve the HTML structure, tags and attributes EXACTLY — translate only human-readable text content.
- Do not translate URLs, email addresses, product references, dates already written out, or the brand name "Piedro".
- Use natural, professional business tone appropriate for healthcare professionals.
Respond with ONLY a JSON object of the form {"<locale>": {"title": "...", "body_html": "..."}} for the requested locales — no markdown fences, no commentary.`,
      messages: [{ role: 'user', content: `Target languages: ${targetList}\n\nTITLE:\n${title}\n\nBODY HTML:\n${bodyHtml}` }],
    })
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('')
    const json = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(json) as Record<string, { title?: string; body_html?: string }>
    const out: Record<string, AnnouncementVariant> = {}
    for (const l of targets) {
      const v = parsed[l]
      if (v?.body_html) out[l] = { title: v.title, bodyHtml: sanitizeEmailHtml(v.body_html) }
    }
    if (!Object.keys(out).length) return { error: 'Translation returned no usable variants' }
    return { translations: out }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Translation failed' }
  }
}
