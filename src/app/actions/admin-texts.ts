'use server'

import Anthropic from '@anthropic-ai/sdk'
import { getAdminScope } from '@/lib/admin/scope'
import { setSettings } from '@/lib/settings'
import { TEXT_BASES, TEXT_LOCALES } from '@/lib/texts-config'

const ALLOWED = new Set(
  TEXT_BASES.flatMap(b => TEXT_LOCALES.map(l => `${b}_${l}`)),
)

async function assertAdmin(): Promise<{ userId: string } | { error: string }> {
  const scope = await getAdminScope()
  if (!scope || scope.role !== 'piedro_admin') return { error: 'Not authorized' }
  return { userId: scope.userId }
}

export async function saveTextsAction(
  values: Record<string, string>,
): Promise<{ ok?: boolean; error?: string }> {
  const auth = await assertAdmin()
  if ('error' in auth) return { error: auth.error }

  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(values)) {
    if (ALLOWED.has(k)) clean[k] = v ?? ''   // empty clears the override (falls back to i18n default)
  }
  const { error } = await setSettings(clean, auth.userId)
  if (error) return { error }
  return { ok: true }
}

const LANG: Record<string, string> = { en: 'English', nl: 'Dutch', fr: 'French', de: 'German' }

export async function proposeTranslationAction(
  text: string,
  targetLocale: string,
): Promise<{ translation?: string; error?: string }> {
  const auth = await assertAdmin()
  if ('error' in auth) return { error: auth.error }

  if (!text?.trim()) return { translation: '' }
  const lang = LANG[targetLocale]
  if (!lang) return { error: 'Unsupported locale' }
  if (!process.env.ANTHROPIC_API_KEY) return { error: 'Translation not available (ANTHROPIC_API_KEY not set)' }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Translate the following UI/email text to ${lang}. Keep the tone professional and concise. Preserve any placeholders like {ref} or {value} exactly. Return ONLY the translation, no quotes or notes:\n\n${text}`,
      }],
    })
    const translation = res.content[0]?.type === 'text' ? res.content[0].text.trim() : ''
    return { translation }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Translation failed' }
  }
}
