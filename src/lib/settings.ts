import { createServiceClient } from '@/lib/supabase/service'

/**
 * Admin-editable app settings (key/value), stored in the `app_settings` table.
 * Server-only (uses the service client). Email senders read these first and fall
 * back to env vars. See migration 009.
 */

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const service = createServiceClient()
  const { data, error } = await service.from('app_settings').select('key, value').in('key', keys)
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const r of data) {
    const v = (r.value ?? '').trim()
    if (v) out[r.key] = v
  }
  return out
}

/** Single setting with an optional fallback (typically the env var). */
export async function getSetting(key: string, fallback?: string): Promise<string | undefined> {
  const s = await getSettings([key])
  return s[key] ?? fallback
}

export async function setSettings(
  entries: Record<string, string>,
  userId?: string,
): Promise<{ error?: string }> {
  const service = createServiceClient()
  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value: (value ?? '').trim() || null,
    updated_at: new Date().toISOString(),
    updated_by: userId ?? null,
  }))
  const { error } = await service.from('app_settings').upsert(rows, { onConflict: 'key' })
  return { error: error?.message }
}
