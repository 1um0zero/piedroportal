'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function updateProfileAction(fields: {
  full_name?: string
  gender?: string
}): Promise<{ ok?: boolean; error?: string }> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await sb.from('profiles').update(fields).eq('id', user.id)
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
  await sb.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)

  return { url: publicUrl }
}
