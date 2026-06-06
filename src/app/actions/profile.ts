'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function updateProfileAction(fields: {
  full_name?: string
  gender?: string
  notify_cc?: string
  notify_bcc?: string
}): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Whitelist the editable fields so a user can never set privileged columns
  // (e.g. role) — and use the service client so profiles RLS can forbid all
  // direct user updates as defence-in-depth.
  const safe: { full_name?: string; gender?: string; notify_cc?: string | null; notify_bcc?: string | null } = {}
  if (fields.full_name !== undefined) safe.full_name = fields.full_name
  if (fields.gender !== undefined) safe.gender = fields.gender
  if (fields.notify_cc !== undefined) safe.notify_cc = fields.notify_cc.trim() || null
  if (fields.notify_bcc !== undefined) safe.notify_bcc = fields.notify_bcc.trim() || null

  const service = createServiceClient()
  const { error } = await service.from('profiles').update(safe).eq('id', user.id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function uploadAvatarAction(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('avatar') as File | null
  if (!file || file.size === 0) return { error: 'No file selected' }
  if (file.size > 2 * 1024 * 1024) return { error: 'File too large (max 2MB)' }
  if (!file.type.startsWith('image/')) return { error: 'Must be an image file' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}.${ext}`
  const bytes = await file.arrayBuffer()

  const service = createServiceClient()
  const { error: uploadErr } = await service.storage
    .from('avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadErr) return { error: `Upload failed: ${uploadErr.message}` }

  const { data: { publicUrl } } = service.storage.from('avatars').getPublicUrl(path)
  await service.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)

  return { url: publicUrl }
}
