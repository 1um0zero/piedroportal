'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getAdminScope } from '@/lib/admin/scope'
import { isPiedroAdmin } from '@/lib/roles'
import { sanitizeEmailHtml } from '@/messaging/render'
import { proposeEmailTranslations } from '@/messaging/translate'
import type { MessageTemplate, TemplateVariant } from '@/messaging/types'

/**
 * /admin/message-templates — CRUD for reusable message templates. Templates are
 * consumed by the broadcast tool ("load from template") and, programmatically,
 * by any feature via `sendTemplateEmail(key, …)` (see @/messaging/send).
 */

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const scope = await getAdminScope()
  if (!scope || !isPiedroAdmin(scope.role)) return { error: 'Not authorized' }
  return { userId: scope.userId }
}

/** Normalize a template key to a stable slug. */
function slugify(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}

export async function listTemplates(): Promise<MessageTemplate[]> {
  const auth = await requireAdmin()
  if ('error' in auth) return []
  const service = createServiceClient()
  const { data } = await service
    .from('message_templates')
    .select('*')
    .order('updated_at', { ascending: false })
  return (data ?? []) as MessageTemplate[]
}

export interface SaveTemplateInput {
  id?: string
  key: string
  name: string
  description?: string | null
  category?: string | null
  subject: string
  bodyHtml: string
  signatureHtml?: string | null
  variables?: string[]
  translations?: Record<string, TemplateVariant> | null
  active?: boolean
}

export async function saveTemplate(input: SaveTemplateInput): Promise<{ ok?: boolean; id?: string; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const key = slugify(input.key || input.name)
  const name = input.name.trim()
  const subject = input.subject.trim()
  if (!key) return { error: 'A key (slug) is required' }
  if (!name) return { error: 'A name is required' }

  // Sanitize author HTML; derive declared variables from what the body actually uses.
  const bodyHtml = sanitizeEmailHtml(input.bodyHtml.trim())
  const signatureHtml = input.signatureHtml?.trim() ? sanitizeEmailHtml(input.signatureHtml.trim()) : null

  let translations: Record<string, TemplateVariant> | null = null
  for (const [loc, v] of Object.entries(input.translations ?? {})) {
    const vSubject = v.subject?.trim()
    const vHtml = v.body_html?.trim() ? sanitizeEmailHtml(v.body_html.trim()) : ''
    if (!vSubject && !vHtml) continue
    translations = translations ?? {}
    translations[loc] = { subject: vSubject ?? '', body_html: vHtml }
  }

  // Auto-detect {{variables}} across subject + body + translations, merged with any explicit list.
  const detected = new Set(input.variables ?? [])
  const scan = [subject, bodyHtml, ...Object.values(translations ?? {}).flatMap(v => [v.subject, v.body_html])]
  for (const s of scan) {
    for (const m of s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) detected.add(m[1])
  }

  const row = {
    key,
    name,
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    subject,
    body_html: bodyHtml,
    signature_html: signatureHtml,
    variables: [...detected],
    translations,
    active: input.active ?? true,
    updated_at: new Date().toISOString(),
  }

  const service = createServiceClient()
  if (input.id) {
    const { error } = await service.from('message_templates').update(row).eq('id', input.id)
    if (error) return { error: error.message }
    revalidatePath('/admin/message-templates')
    return { ok: true, id: input.id }
  }
  const { data, error } = await service.from('message_templates')
    .insert({ ...row, created_by: auth.userId })
    .select('id').single()
  if (error) {
    if (error.code === '23505') return { error: `A template with key "${key}" already exists` }
    return { error: error.message }
  }
  revalidatePath('/admin/message-templates')
  return { ok: true, id: data.id }
}

export async function deleteTemplate(id: string): Promise<{ ok?: boolean; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { error } = await service.from('message_templates').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/message-templates')
  return { ok: true }
}

export async function duplicateTemplate(id: string): Promise<{ ok?: boolean; id?: string; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const service = createServiceClient()
  const { data: src } = await service.from('message_templates').select('*').eq('id', id).maybeSingle()
  if (!src) return { error: 'Template not found' }
  const t = src as MessageTemplate
  // Find a free "<key>_copy[_n]" slug.
  let key = `${t.key}_copy`
  for (let n = 2; ; n++) {
    const { data: clash } = await service.from('message_templates').select('id').eq('key', key).maybeSingle()
    if (!clash) break
    key = `${t.key}_copy_${n}`
  }
  const { data, error } = await service.from('message_templates').insert({
    key, name: `${t.name} (copy)`, description: t.description, category: t.category,
    subject: t.subject, body_html: t.body_html, signature_html: t.signature_html,
    variables: t.variables, translations: t.translations, active: false, created_by: auth.userId,
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath('/admin/message-templates')
  return { ok: true, id: data.id }
}

/** AI-propose translations of a template's subject + body into the given locales. */
export async function translateTemplate(
  subject: string,
  bodyHtml: string,
  sourceLocale: string,
  targetLocales: string[],
): Promise<{ translations?: Record<string, TemplateVariant>; error?: string }> {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  return proposeEmailTranslations(subject, bodyHtml, sourceLocale, targetLocales)
}
